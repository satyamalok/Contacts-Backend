# ✅ Deployment Checklist

Print this page and check off items as you complete them.

---

## Pre-Deployment

- [ ] VPS is accessible via SSH
- [ ] Portainer is installed (port 9000)
- [ ] Nginx Proxy Manager is installed (port 81)
- [ ] Domain `contacts.tsblive.in` is pointed to VPS IP
- [ ] GitHub account is ready

---

## Step 1: Push to GitHub (5 minutes)

- [ ] Navigate to project folder in terminal
- [ ] Run: `git add .`
- [ ] Run: `git commit -m "Add complete contacts sync backend"`
- [ ] Run: `git push origin main`
- [ ] Verify files on GitHub: https://github.com/satyamalok/Contacts-Backend

---

## Step 2: Deploy with Portainer (10 minutes)

- [ ] Open Portainer: http://your-vps-ip:9000
- [ ] Go to: Stacks → + Add stack
- [ ] Name: `contacts-sync-backend`
- [ ] Copy docker-compose from `DEPLOYMENT_QUICK_REFERENCE.md`
- [ ] Click: Deploy the stack
- [ ] Wait 3-5 minutes for build
- [ ] Check containers are running: Containers section
- [ ] Verify logs show: "Server listening on http://0.0.0.0:3000"
- [ ] Test from VPS: `curl http://localhost:3000/health`

---

## Step 3: Configure Nginx Proxy Manager (5 minutes)

- [ ] Open NPM: http://your-vps-ip:81
- [ ] Go to: Hosts → Proxy Hosts → Add Proxy Host
- [ ] Enter domain: `contacts.tsblive.in`
- [ ] Enter forward: `contacts-sync-app` port `3000`
- [ ] **CRITICAL:** Enable "Websockets Support" checkbox
- [ ] Enable "Block Common Exploits"
- [ ] Go to SSL tab
- [ ] Request new SSL certificate (Let's Encrypt)
- [ ] Enter your email
- [ ] Enable: Force SSL, HTTP/2, HSTS
- [ ] Click Save
- [ ] Wait for SSL certificate generation

---

## Step 4: Create First Agent (2 minutes)

- [ ] Run command:
```bash
curl -X POST https://contacts.tsblive.in/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"agent_code": "ADMIN", "agent_name": "Administrator"}'
```
- [ ] **SAVE THE API KEY!** Write it here: ________________________________

---

## Step 5: Access and Verify (5 minutes)

- [ ] Open browser: https://contacts.tsblive.in
- [ ] Login with API key from Step 4
- [ ] Verify dashboard loads
- [ ] Check API docs: https://contacts.tsblive.in/docs
- [ ] Check health: https://contacts.tsblive.in/health
- [ ] Test creating a contact via web dashboard
- [ ] Verify contact appears in list

---

## Step 6: Production Configuration (5 minutes)

- [ ] In Portainer → Stacks → contacts-sync-backend → Editor
- [ ] Change `API_KEY_SALT` to random string
- [ ] Change `CORS_ORIGIN` to `https://contacts.tsblive.in`
- [ ] Change `FRONTEND_URL` to `https://contacts.tsblive.in`
- [ ] (Optional) Change `DB_PASSWORD` to stronger password
- [ ] Click: Update the stack
- [ ] Verify services restart successfully

---

## Step 7: Create Additional Agents (2 minutes each)

For each sales team member, run:
```bash
curl -X POST https://contacts.tsblive.in/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"agent_code": "AGENT001", "agent_name": "Agent Name"}'
```

| Agent Code | Agent Name | API Key |
|------------|------------|---------|
| ADMIN | Administrator | _________________________ |
| AGENT001 | _____________ | _________________________ |
| AGENT002 | _____________ | _________________________ |
| AGENT003 | _____________ | _________________________ |
| ... | ... | ... |

---

## Step 8: Android Integration (Hand off to developer)

- [ ] Give file `docs/ANDROID_API.md` to Android developer
- [ ] Provide Base URL: `https://contacts.tsblive.in`
- [ ] Provide WebSocket URL: `wss://contacts.tsblive.in`
- [ ] Provide test API key and agent code
- [ ] Schedule integration review meeting

---

## Step 9: Set Up Monitoring (10 minutes)

### Create Backup Script
- [ ] Create file: `/opt/backup-contacts.sh`
```bash
#!/bin/bash
mkdir -p /backups
docker exec contacts-sync-db pg_dump -U postgres contacts_db > /backups/contacts_$(date +%Y%m%d).sql
find /backups -name "contacts_*.sql" -mtime +7 -delete
```
- [ ] Make executable: `chmod +x /opt/backup-contacts.sh`
- [ ] Test backup: `/opt/backup-contacts.sh`
- [ ] Add to crontab: `crontab -e`
- [ ] Add line: `0 2 * * * /opt/backup-contacts.sh`

### Set Up Monitoring
- [ ] Set up uptime monitoring (UptimeRobot, etc.)
- [ ] Monitor URL: https://contacts.tsblive.in/health
- [ ] Configure email alerts for downtime
- [ ] Set up log rotation if needed

---

## Step 10: Documentation (5 minutes)

- [ ] Document API keys in secure location (password manager)
- [ ] Document database password
- [ ] Document VPS access details
- [ ] Create runbook for common issues
- [ ] Share access with team members (if needed)

---

## Post-Deployment Testing (10 minutes)

### API Testing
- [ ] Test registration: Create new agent
- [ ] Test authentication: Verify API key
- [ ] Test create contact: POST /api/contacts
- [ ] Test list contacts: GET /api/contacts
- [ ] Test update contact: PUT /api/contacts/:id
- [ ] Test delete contact: DELETE /api/contacts/:id
- [ ] Test sync: GET /api/sync/delta?version=0

### WebSocket Testing
- [ ] Open browser console on dashboard
- [ ] Verify WebSocket connection in Network tab
- [ ] Create contact in one browser tab
- [ ] Verify it appears in another tab (real-time)

### Load Testing (Optional)
- [ ] Use API testing tool (Postman, etc.)
- [ ] Simulate 10 concurrent requests
- [ ] Verify all succeed
- [ ] Check response times are acceptable

---

## Maintenance Schedule

### Daily
- [ ] Check health endpoint: https://contacts.tsblive.in/health
- [ ] Monitor container status: `docker ps | grep contacts`
- [ ] Review error logs: `docker logs contacts-sync-app --tail 100`

### Weekly
- [ ] Check disk space: `df -h`
- [ ] Review application logs
- [ ] Verify backups are running
- [ ] Check device sync status in dashboard

### Monthly
- [ ] Update Docker images: `docker-compose pull`
- [ ] Rebuild stack: Update stack in Portainer
- [ ] Review security updates
- [ ] Update documentation if needed
- [ ] Review and clean old logs

---

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| System Admin | _____________ | _____________ |
| Developer | _____________ | _____________ |
| VPS Provider | _____________ | _____________ |

---

## Quick Commands Reference

### View Logs
```bash
docker logs contacts-sync-app -f
docker logs contacts-sync-db
docker logs contacts-sync-redis
```

### Restart Services
```bash
docker restart contacts-sync-app
docker restart contacts-sync-db
docker restart contacts-sync-redis
```

### Check Status
```bash
docker ps | grep contacts
docker stats contacts-sync-app
curl https://contacts.tsblive.in/health
```

### Backup
```bash
docker exec contacts-sync-db pg_dump -U postgres contacts_db > backup.sql
```

### Restore
```bash
docker exec -i contacts-sync-db psql -U postgres contacts_db < backup.sql
```

### Update from GitHub
In Portainer:
1. Stacks → contacts-sync-backend
2. Click "Editor"
3. Click "Update the stack" with "Re-pull and redeploy" checked

---

## Success Criteria

Your deployment is successful when:

- ✅ Health check returns "healthy"
- ✅ Web dashboard is accessible via HTTPS
- ✅ API documentation loads at /docs
- ✅ SSL certificate is valid (green padlock)
- ✅ You can create, read, update, delete contacts
- ✅ WebSocket connection is established (check browser console)
- ✅ Real-time updates work across browser tabs
- ✅ Logs show no errors
- ✅ All containers are healthy
- ✅ Backup script runs successfully

---

## Deployment Completion

- [ ] All checklist items completed
- [ ] System tested and working
- [ ] Documentation updated
- [ ] Team notified
- [ ] Monitoring configured
- [ ] Backups scheduled

**Deployment Date:** ___________________

**Deployed By:** ___________________

**Production URL:** https://contacts.tsblive.in

**Status:** ⬜ Planning  ⬜ In Progress  ⬜ Completed  ⬜ Live

---

## Notes / Issues Encountered

____________________________________________________________________________

____________________________________________________________________________

____________________________________________________________________________

____________________________________________________________________________

---

**Congratulations! Your Contacts Sync Backend is now live! 🎉**
