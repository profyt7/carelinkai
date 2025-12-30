# GitHub Workflow Setup Instructions

## ⚠️ Important Notice

The GitHub Actions workflow file for automated follow-ups needs to be added manually due to GitHub PAT scope limitations. The current Personal Access Token doesn't have the `workflow` scope required to push workflow files.

## 📁 File to Add

**File Location**: `.github/workflows/process-followups.yml`

**File Content**:
```yaml
name: Process Follow-ups

on:
  # Run every 6 hours
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours at minute 0
  
  # Allow manual trigger for testing
  workflow_dispatch:

jobs:
  process-followups:
    runs-on: ubuntu-latest
    
    steps:
      - name: Process Follow-ups
        run: |
          echo "Processing follow-ups at $(date)"
          
          # Call the follow-ups processing endpoint
          response=$(curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            -w "\n%{http_code}" \
            -s \
            https://carelinkai.onrender.com/api/follow-ups/process)
          
          # Extract status code
          status_code=$(echo "$response" | tail -n1)
          body=$(echo "$response" | head -n-1)
          
          echo "Status Code: $status_code"
          echo "Response: $body"
          
          # Check if successful
          if [ "$status_code" -eq 200 ]; then
            echo "✅ Follow-ups processed successfully"
          else
            echo "❌ Failed to process follow-ups"
            exit 1
          fi
      
      - name: Report Status
        if: always()
        run: |
          if [ $? -eq 0 ]; then
            echo "Follow-up processing completed successfully"
          else
            echo "Follow-up processing failed - check logs"
          fi
```

## 🔧 Manual Setup Options

### Option 1: GitHub Web UI (Recommended)

1. **Go to your repository**:
   - Navigate to https://github.com/profyt7/carelinkai

2. **Navigate to workflows directory**:
   - Click on `.github` folder
   - Click on `workflows` folder
   - Click "Add file" → "Create new file"

3. **Create the workflow file**:
   - Name: `process-followups.yml`
   - Paste the content from above
   - Scroll down and click "Commit new file"

4. **Verify creation**:
   - Go to "Actions" tab
   - You should see "Process Follow-ups" workflow

### Option 2: Local Machine (If you have repo cloned)

1. **Pull the latest changes**:
   ```bash
   git pull origin main
   ```

2. **Create the workflow file**:
   ```bash
   # Create directory if it doesn't exist
   mkdir -p .github/workflows
   
   # Create the file (copy content from above)
   nano .github/workflows/process-followups.yml
   ```

3. **Commit and push**:
   ```bash
   git add .github/workflows/process-followups.yml
   git commit -m "feat: Add automated follow-ups GitHub Actions workflow"
   git push origin main
   ```

### Option 3: Update GitHub Token with Workflow Scope

1. **Generate new token with workflow scope**:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Select scopes:
     - ✅ `repo` (Full control of private repositories)
     - ✅ `workflow` (Update GitHub Action workflows)
   - Click "Generate token"
   - Copy the new token

2. **Update remote URL**:
   ```bash
   cd /home/ubuntu/carelinkai-project
   git remote set-url origin https://YOUR_NEW_TOKEN@github.com/profyt7/carelinkai.git
   ```

3. **Push the workflow file**:
   ```bash
   git add .github/workflows/process-followups.yml
   git commit -m "feat: Add automated follow-ups GitHub Actions workflow"
   git push origin main
   ```

## 🔑 Required GitHub Secret

Before the workflow can run, you need to add the CRON_SECRET to GitHub:

1. **Generate CRON_SECRET** (if not already done):
   ```bash
   openssl rand -hex 32
   ```

2. **Add to GitHub**:
   - Go to https://github.com/profyt7/carelinkai/settings/secrets/actions
   - Click "New repository secret"
   - Name: `CRON_SECRET`
   - Value: (paste the generated secret)
   - Click "Add secret"

3. **Add to Render** (same value):
   - Go to https://dashboard.render.com
   - Select carelinkai service
   - Environment tab
   - Add: `CRON_SECRET` = (same value)

## ✅ Verification

After adding the workflow file:

1. **Check Actions tab**:
   - Go to https://github.com/profyt7/carelinkai/actions
   - You should see "Process Follow-ups" workflow

2. **Manual trigger test**:
   - Click on "Process Follow-ups"
   - Click "Run workflow"
   - Select "main" branch
   - Click "Run workflow"
   - Wait for completion (~30 seconds)

3. **Check execution logs**:
   - Click on the workflow run
   - View logs for success/failure

## 📅 Workflow Schedule

Once enabled, the workflow will run automatically:
- **Every 6 hours**: 12 AM, 6 AM, 12 PM, 6 PM UTC
- **Manual trigger**: Available anytime via Actions tab

## 🎯 Expected Behavior

When the workflow runs:
1. Connects to Render deployment
2. Calls `/api/follow-ups/process` endpoint
3. Processes all due follow-ups
4. Sends emails/SMS to families
5. Updates database records
6. Reports success/failure

## 📊 Monitoring

**GitHub Actions Logs**:
- https://github.com/profyt7/carelinkai/actions/workflows/process-followups.yml

**Render Logs**:
- Dashboard → carelinkai → Logs
- Filter by "follow-up"

## ⚠️ Troubleshooting

### Workflow not showing up?
- Verify file is in `.github/workflows/` directory
- Check file extension is `.yml` or `.yaml`
- Refresh Actions tab

### Workflow failing with 403?
- Verify CRON_SECRET is added to GitHub secrets
- Check secret name matches exactly: `CRON_SECRET`
- Ensure Render has same CRON_SECRET value

### Workflow not triggering automatically?
- Wait for next scheduled time
- GitHub Actions may have delays
- Use manual trigger for immediate testing

## 📞 Need Help?

- Read full setup guide: `FOLLOWUPS_QUICKSTART.md`
- Check comprehensive docs: `/home/ubuntu/AUTOMATED_FOLLOWUPS_SETUP.txt`
- GitHub Issues: https://github.com/profyt7/carelinkai/issues

## 🎉 Ready to Go!

Once you've added the workflow file:
1. Your follow-ups will process automatically every 6 hours
2. You can manually trigger anytime for testing
3. All executions are logged in GitHub Actions
4. System works 24/7 without manual intervention

**Recommended**: Use Option 1 (GitHub Web UI) for the easiest setup!
