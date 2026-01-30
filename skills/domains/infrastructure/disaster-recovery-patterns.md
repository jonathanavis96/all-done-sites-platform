# Disaster Recovery Patterns

## Overview

Disaster recovery (DR) ensures business continuity when systems fail. This guide covers backup strategies, recovery procedures, RPO/RTO planning, and chaos engineering fundamentals.

## Quick Reference

| Pattern | Use Case | RPO | RTO |
| ------- | -------- | --- | --- |
| Hot Standby | Mission-critical systems | Near-zero | < 1 min |
| Warm Standby | Production systems | Minutes | < 1 hour |
| Cold Standby | Non-critical systems | Hours | < 24 hours |
| Backup & Restore | Development/staging | Days | Days |
| Pilot Light | Cost-sensitive DR | Hours | Hours |
| Multi-Region Active | Zero downtime required | Real-time | Instant |

## Core Concepts

### RPO (Recovery Point Objective)

**Maximum acceptable data loss** measured in time.

- **RPO = 1 hour:** Can lose up to 1 hour of data
- **RPO = 0:** Zero data loss (synchronous replication)
- **RPO = 24 hours:** Daily backups acceptable

### RTO (Recovery Time Objective)

**Maximum acceptable downtime** measured in time.

- **RTO = 5 minutes:** System must be restored within 5 minutes
- **RTO = 4 hours:** System must be restored within 4 hours
- **RTO = 24 hours:** System must be restored within 1 day

### Common Pitfalls

| ❌ Don't | ✅ Do |
| -------- | ----- |
| Assume backups work | Test restores regularly (monthly minimum) |
| Store backups in same region | Use geographic redundancy (3-2-1 rule) |
| Ignore backup verification | Automate backup integrity checks |
| Skip DR drills | Run gamedays quarterly |
| Rely on manual procedures | Automate recovery runbooks |
| Forget about dependencies | Document full dependency graph |

## Backup Strategies

### 3-2-1 Rule

**3 copies** of data on **2 different media** with **1 offsite**.

```bash
#!/bin/bash
# Example: Automated 3-2-1 backup script

set -euo pipefail

BACKUP_DIR="/var/backups"
REMOTE_BUCKET="s3://company-dr-backups"
DATE=$(date +%Y%m%d-%H%M%S)

# Copy 1: Primary data (production)
# Copy 2: Local backup (different media - NAS/disk)
tar -czf "${BACKUP_DIR}/db-${DATE}.tar.gz" /var/lib/postgresql/data

# Copy 3: Remote backup (offsite - S3)
aws s3 cp "${BACKUP_DIR}/db-${DATE}.tar.gz" \
  "${REMOTE_BUCKET}/daily/db-${DATE}.tar.gz" \
  --storage-class GLACIER

# Verify backup integrity
tar -tzf "${BACKUP_DIR}/db-${DATE}.tar.gz" > /dev/null

# Cleanup old local backups (keep 7 days)
find "${BACKUP_DIR}" -name "db-*.tar.gz" -mtime +7 -delete

# Log success
echo "[$(date)] Backup completed: db-${DATE}.tar.gz" >> /var/log/backup.log
```

### Incremental vs Full Backups

**Full backup:** Complete copy of all data (slow, large storage).

**Incremental backup:** Only changes since last backup (fast, efficient).

```python
# Backup strategy with rotation
from datetime import datetime, timedelta
import subprocess

class BackupScheduler:
    def __init__(self, full_day=0):  # 0 = Sunday
        self.full_day = full_day
    
    def should_run_full_backup(self):
        """Full backup weekly, incremental daily"""
        return datetime.now().weekday() == self.full_day
    
    def run_backup(self, source, destination):
        backup_type = "full" if self.should_run_full_backup() else "incremental"
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        
        if backup_type == "full":
            # Full backup using rsync
            cmd = [
                "rsync", "-a", "--delete",
                f"--link-dest={destination}/latest",
                source, f"{destination}/full-{timestamp}"
            ]
        else:
            # Incremental using rsync with link-dest
            cmd = [
                "rsync", "-a",
                f"--link-dest={destination}/latest",
                source, f"{destination}/incr-{timestamp}"
            ]
        
        subprocess.run(cmd, check=True)
        
        # Update 'latest' symlink
        subprocess.run([
            "ln", "-snf", f"{backup_type}-{timestamp}",
            f"{destination}/latest"
        ], check=True)
        
        return backup_type, timestamp

# Usage
scheduler = BackupScheduler(full_day=0)  # Sunday full backups
backup_type, timestamp = scheduler.run_backup(
    source="/var/lib/postgresql",
    destination="/mnt/nas/backups"
)
print(f"{backup_type.upper()} backup completed: {timestamp}")
```

### Database-Specific Backups

**PostgreSQL with point-in-time recovery:**

```bash
#!/bin/bash
# PostgreSQL continuous archiving

# Enable WAL archiving in postgresql.conf:
# wal_level = replica
# archive_mode = on
# archive_command = 'test ! -f /mnt/wal_archive/%f && cp %p /mnt/wal_archive/%f'

# Base backup
pg_basebackup -h localhost -U postgres \
  -D /mnt/backups/base-$(date +%Y%m%d) \
  -Ft -z -Xs -P

# Restore to specific point in time
# 1. Stop PostgreSQL
# 2. Clear data directory
# 3. Extract base backup
tar -xzf /mnt/backups/base-20260124.tar.gz -C /var/lib/postgresql/data

# 4. Configure recovery settings (PostgreSQL 12+)
# Add recovery settings to postgresql.conf
cat >> /var/lib/postgresql/data/postgresql.conf <<EOF
restore_command = 'cp /mnt/wal_archive/%f %p'
recovery_target_time = '2026-01-24 14:30:00'
recovery_target_action = 'promote'
EOF

# 5. Create recovery.signal file to enable recovery mode
touch /var/lib/postgresql/data/recovery.signal

# 6. Start PostgreSQL - it will replay WAL to target time
systemctl start postgresql
```

## Restoration Procedures

### DR Runbook Template

```markdown
# DR Runbook: [Service Name]

## Service Overview
- **Service:** API Gateway
- **RPO:** 5 minutes
- **RTO:** 15 minutes
- **Owner:** Platform Team
- **On-call:** +1-555-0100

## Prerequisites
- [ ] AWS CLI configured with DR credentials
- [ ] Access to S3 backup bucket: s3://company-dr-backups
- [ ] SSH access to bastion host: bastion.dr.company.com
- [ ] Database credentials from 1Password vault

## Detection
**Symptoms:** 
- API returns 503 errors
- Datadog shows region-us-east-1 offline
- PagerDuty alert: "API Gateway Down"

## Recovery Steps

### Step 1: Assess Scope (5 min)
```bash
# Check region health
aws ec2 describe-instance-status --region us-east-1

# Check database connectivity
psql -h primary-db.us-east-1.rds.amazonaws.com -U app -c "SELECT 1"
```

### Step 2: Activate DR Site (5 min)

```bash
# Switch DNS to DR region
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456 \
  --change-batch file://dr-dns-failover.json

# Start EC2 instances in us-west-2
aws ec2 start-instances --instance-ids \
  i-dr001 i-dr002 i-dr003 --region us-west-2
```

### Step 3: Restore Database (10 min)

```bash
# Promote read replica to primary
aws rds promote-read-replica \
  --db-instance-identifier api-db-replica-west \
  --region us-west-2

# Verify promotion
aws rds describe-db-instances \
  --db-instance-identifier api-db-replica-west \
  --query 'DBInstances[0].StatusInfos'
```

### Step 4: Verify Service (5 min)

```bash
# Health check
curl -f https://api.company.com/health

# Run smoke tests
./scripts/smoke-test.sh --env dr
```

## Rollback Procedure

If DR activation fails:

1. Revert DNS changes
2. Stop DR instances
3. Escalate to senior engineer

## Post-Incident

- [ ] Update RCA document
- [ ] Schedule DR drill review
- [ ] Update runbook with lessons learned

```markdown

### Automated Recovery Script

```python
#!/usr/bin/env python3
"""Automated disaster recovery orchestration"""

import boto3
import time
import logging
from dataclasses import dataclass
from typing import List

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class RecoveryStep:
    name: str
    action: callable
    timeout_seconds: int
    rollback: callable = None

class DROrchestrator:
    def __init__(self, primary_region: str, dr_region: str):
        self.primary_region = primary_region
        self.dr_region = dr_region
        self.ec2_dr = boto3.client('ec2', region_name=dr_region)
        self.rds_dr = boto3.client('rds', region_name=dr_region)
        self.route53 = boto3.client('route53')
        
    def check_primary_health(self) -> bool:
        """Check if primary region is responsive"""
        try:
            ec2_primary = boto3.client('ec2', region_name=self.primary_region)
            response = ec2_primary.describe_instance_status()
            return len(response['InstanceStatuses']) > 0
        except Exception as e:
            logger.error(f"Primary region unhealthy: {e}")
            return False
    
    def failover_dns(self, hosted_zone_id: str, record_name: str, dr_value: str):
        """Update Route53 to point to DR region"""
        change_batch = {
            'Changes': [{
                'Action': 'UPSERT',
                'ResourceRecordSet': {
                    'Name': record_name,
                    'Type': 'A',
                    'TTL': 60,
                    'ResourceRecords': [{'Value': dr_value}]
                }
            }]
        }
        
        response = self.route53.change_resource_record_sets(
            HostedZoneId=hosted_zone_id,
            ChangeBatch=change_batch
        )
        
        change_id = response['ChangeInfo']['Id']
        logger.info(f"DNS failover initiated: {change_id}")
        
        # Wait for DNS propagation
        waiter = self.route53.get_waiter('resource_record_sets_changed')
        waiter.wait(Id=change_id)
        logger.info("DNS failover complete")
    
    def start_dr_instances(self, instance_ids: List[str]):
        """Start EC2 instances in DR region"""
        logger.info(f"Starting {len(instance_ids)} instances")
        self.ec2_dr.start_instances(InstanceIds=instance_ids)
        
        # Wait for instances to be running
        waiter = self.ec2_dr.get_waiter('instance_running')
        waiter.wait(InstanceIds=instance_ids)
        logger.info("All instances running")
    
    def promote_rds_replica(self, replica_id: str):
        """Promote read replica to primary"""
        logger.info(f"Promoting replica: {replica_id}")
        self.rds_dr.promote_read_replica(DBInstanceIdentifier=replica_id)
        
        # Wait for promotion
        waiter = self.rds_dr.get_waiter('db_instance_available')
        waiter.wait(DBInstanceIdentifier=replica_id)
        logger.info("Database promoted")
    
    def execute_dr_plan(self):
        """Execute full DR plan with rollback support"""
        steps = [
            RecoveryStep(
                name="Start DR instances",
                action=lambda: self.start_dr_instances(['i-dr001', 'i-dr002']),
                timeout_seconds=300,
                rollback=lambda: self.ec2_dr.stop_instances(InstanceIds=['i-dr001', 'i-dr002'])
            ),
            RecoveryStep(
                name="Promote database",
                action=lambda: self.promote_rds_replica('api-db-replica-west'),
                timeout_seconds=600
            ),
            RecoveryStep(
                name="Failover DNS",
                action=lambda: self.failover_dns('Z123456', 'api.company.com', '10.0.2.100'),
                timeout_seconds=120
            )
        ]
        
        executed_steps = []
        
        try:
            for step in steps:
                logger.info(f"Executing: {step.name}")
                start_time = time.time()
                
                step.action()
                
                duration = time.time() - start_time
                logger.info(f"Completed {step.name} in {duration:.1f}s")
                executed_steps.append(step)
                
        except Exception as e:
            logger.error(f"DR execution failed: {e}")
            
            # Rollback executed steps
            for step in reversed(executed_steps):
                if step.rollback:
                    logger.warning(f"Rolling back: {step.name}")
                    try:
                        step.rollback()
                    except Exception as rb_error:
                        logger.error(f"Rollback failed: {rb_error}")
            
            raise

# Usage
if __name__ == "__main__":
    orchestrator = DROrchestrator(
        primary_region='us-east-1',
        dr_region='us-west-2'
    )
    
    if not orchestrator.check_primary_health():
        logger.warning("Primary region down - initiating DR")
        orchestrator.execute_dr_plan()
    else:
        logger.info("Primary region healthy - no DR needed")
```

## RPO/RTO Planning

### DR Planning Checklist

**Business Requirements:**

- [ ] Document acceptable data loss (RPO) per service
- [ ] Document acceptable downtime (RTO) per service
- [ ] Calculate cost of downtime per hour
- [ ] Identify tier 1 (critical) vs tier 2 (important) systems

**Technical Implementation:**

- [ ] Select DR strategy based on RPO/RTO (see table above)
- [ ] Configure cross-region replication (database, S3, EBS)
- [ ] Set up automated backups with retention policies
- [ ] Implement backup verification and integrity checks
- [ ] Create and test restoration procedures

**Operational Readiness:**

- [ ] Write DR runbooks for each critical service
- [ ] Schedule quarterly DR drills (gamedays)
- [ ] Train on-call engineers on DR procedures
- [ ] Document escalation paths
- [ ] Set up monitoring for backup failures

### DR Strategy Selection Matrix

```text
                    RPO
           ┌──────────────────────────┐
           │ Seconds  Minutes   Hours │
      ┌────┼──────────────────────────┤
      │ M  │ Multi-   Hot       Pilot │
RTO   │ i  │ Region   Standby   Light │
      │ n  │                          │
      │ u  ├──────────────────────────┤
      │ t  │ Hot      Warm      Cold  │
      │ e  │ Standby  Standby   Standby│
      │ s  │                          │
      ├────┼──────────────────────────┤
      │ H  │ Warm     Cold      Backup│
      │ o  │ Standby  Standby   Restore│
      │ u  │                          │
      │ r  ├──────────────────────────┤
      │ s  │ Cold     Backup    Backup│
      │    │ Standby  Restore   Restore│
      └────┴──────────────────────────┘
```

### Cost vs Reliability Trade-offs

```python
# Calculate DR strategy costs
from dataclasses import dataclass

@dataclass
class DRStrategy:
    name: str
    rpo_minutes: int
    rto_minutes: int
    monthly_cost: float
    
    def meets_requirements(self, required_rpo: int, required_rto: int) -> bool:
        return (self.rpo_minutes <= required_rpo and 
                self.rto_minutes <= required_rto)

# Available strategies
strategies = [
    DRStrategy("Multi-Region Active", 0, 1, 50000),
    DRStrategy("Hot Standby", 5, 5, 20000),
    DRStrategy("Warm Standby", 15, 60, 8000),
    DRStrategy("Pilot Light", 60, 120, 3000),
    DRStrategy("Cold Standby", 240, 480, 1000),
    DRStrategy("Backup & Restore", 1440, 1440, 500)
]

def select_cheapest_strategy(required_rpo: int, required_rto: int):
    """Select most cost-effective strategy meeting requirements"""
    eligible = [s for s in strategies 
                if s.meets_requirements(required_rpo, required_rto)]
    
    if not eligible:
        return None
    
    return min(eligible, key=lambda s: s.monthly_cost)

# Example: API service needs RPO=15min, RTO=30min
best = select_cheapest_strategy(required_rpo=15, required_rto=30)
print(f"Recommended: {best.name} (${best.monthly_cost}/month)")
# Output: Recommended: Warm Standby ($8000/month)
```

## Chaos Engineering

### Introduction

**Chaos engineering:** Deliberately injecting failures to test system resilience.

**Goal:** Discover weaknesses before they cause outages.

### Chaos Experiments

**Start small, increase scope gradually:**

1. **Development:** Test in dev environment
2. **Staging:** Test with production-like load
3. **Production:** Test in production during low-traffic windows
4. **Always-on:** Continuous chaos in production

### Example Chaos Experiments

**Kill random pod (Kubernetes):**

```bash
#!/bin/bash
# Chaos experiment: Random pod termination

set -euo pipefail

NAMESPACE="production"
LABEL_SELECTOR="app=api"

# Get random pod
POD=$(kubectl get pods -n "$NAMESPACE" -l "$LABEL_SELECTOR" \
  -o jsonpath='{.items[*].metadata.name}' | \
  tr ' ' '\n' | shuf -n 1)

echo "🔥 Chaos: Killing pod $POD"
kubectl delete pod -n "$NAMESPACE" "$POD"

# Monitor recovery
echo "⏱️  Monitoring service recovery..."
for i in {1..30}; do
  if kubectl get pods -n "$NAMESPACE" -l "$LABEL_SELECTOR" | grep -q "Running"; then
    echo "✅ Service recovered in ${i} seconds"
    exit 0
  fi
  sleep 1
done

echo "❌ Service did not recover within 30 seconds"
exit 1
```

**Inject network latency:**

```bash
#!/bin/bash
# Chaos experiment: Network latency injection

# Add 200ms latency to eth0
tc qdisc add dev eth0 root netem delay 200ms 50ms

echo "🔥 Injected 200ms ±50ms latency"

# Run for 5 minutes
sleep 300

# Cleanup
tc qdisc del dev eth0 root

echo "✅ Latency injection complete"
```

**Database connection pool exhaustion:**

```python
#!/usr/bin/env python3
"""Chaos experiment: Exhaust database connections"""

import psycopg2
import time

def exhaust_connections(host, dbname, user, password, max_connections=100):
    """Open connections until pool is exhausted"""
    connections = []
    
    print(f"🔥 Chaos: Exhausting connection pool ({max_connections} connections)")
    
    try:
        for i in range(max_connections):
            conn = psycopg2.connect(
                host=host,
                dbname=dbname,
                user=user,
                password=password
            )
            connections.append(conn)
            print(f"Opened connection {i+1}/{max_connections}")
            time.sleep(0.1)
    
    except psycopg2.OperationalError as e:
        print(f"❌ Connection pool exhausted: {e}")
    
    finally:
        # Hold connections for 5 minutes
        print("⏱️  Holding connections for 5 minutes...")
        time.sleep(300)
        
        # Cleanup
        for conn in connections:
            conn.close()
        
        print("✅ Experiment complete, connections released")

if __name__ == "__main__":
    exhaust_connections(
        host="db.staging.company.com",
        dbname="app",
        user="chaos_user",
        password="chaos_pass",  # pragma: allowlist secret
        max_connections=90  # Leave 10 connections available
    )
```

### Chaos Engineering Best Practices

| ❌ Don't | ✅ Do |
| -------- | ----- |
| Run chaos in production without approval | Get stakeholder buy-in first |
| Chaos during peak traffic | Run during maintenance windows initially |
| Skip monitoring during experiments | Monitor metrics continuously |
| Forget to clean up | Always include cleanup/rollback code |
| Run multiple experiments simultaneously | One experiment at a time initially |

## Related Skills

- **deployment-patterns.md** - Blue/green, canary releases
- **observability-patterns.md** - Monitoring during incidents
- **security-patterns.md** - DR security considerations
- **state-management-patterns.md** - Stateful service DR

## References

- AWS Well-Architected Framework - Reliability Pillar
- Google SRE Book - Chapter 26 (Data Integrity)
- Principles of Chaos Engineering - <https://principlesofchaos.org>
