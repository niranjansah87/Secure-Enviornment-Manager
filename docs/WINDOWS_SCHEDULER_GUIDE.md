# Windows Task Scheduler Setup Guide
## Automated Email Backups for Dotenv Server

This guide will help you set up automated email backups using Windows Task Scheduler.

---

## Step-by-Step Instructions

### Step 1: Open Task Scheduler

1. Press `Win + R` to open Run dialog
2. Type `taskschd.msc` and press Enter
3. Task Scheduler window will open

**OR**

1. Press `Win + S` to open Search
2. Type "Task Scheduler"
3. Click on "Task Scheduler" app

---

### Step 2: Create a New Task

1. In Task Scheduler, click **"Create Basic Task..."** in the right panel
   - (For advanced users: Click "Create Task..." for more options)

2. **Name your task:**
   - Name: `Dotenv Email Backup`
   - Description: `Automated daily backup of environment variables sent via email`
   - Click **Next**

---

### Step 3: Set the Trigger (Schedule)

Choose when you want backups to run:

#### Option A: Daily Backup
1. Select **"Daily"**
2. Click **Next**
3. Set start time: `02:00:00` (2 AM)
4. Set start date: Today's date
5. Recur every: `1` days
6. Click **Next**

#### Option B: Weekly Backup
1. Select **"Weekly"**
2. Click **Next**
3. Set start time: `02:00:00` (2 AM)
4. Select day: Check **Sunday** (or your preferred day)
5. Recur every: `1` weeks
6. Click **Next**

#### Option C: Monthly Backup
1. Select **"Monthly"**
2. Click **Next**
3. Select months: Check all months
4. Select days: Choose **First** day of month
5. Set start time: `02:00:00` (2 AM)
6. Click **Next**

---

### Step 4: Set the Action

1. Select **"Start a program"**
2. Click **Next**

3. **Program/script:**
   ```
   C:\Users\91800\AppData\Local\Programs\Python\Python313\python.exe
   ```
   
   **Note:** Your Python path might be different. To find it:
   - Open Command Prompt
   - Type: `where python`
   - Copy the full path shown

4. **Add arguments:**
   ```
   email_backup.py
   ```

5. **Start in (important!):**
   ```
   C:\kumari ai\dotenv-server-master
   ```

6. Click **Next**

---

### Step 5: Review and Finish

1. Review your settings
2. Check the box: **"Open the Properties dialog for this task when I click Finish"**
3. Click **Finish**

---

### Step 6: Configure Advanced Settings

The Properties dialog will open. Make these changes:

#### General Tab:
- ✅ Check: **"Run whether user is logged on or not"**
- ✅ Check: **"Run with highest privileges"**
- Set "Configure for": **Windows 10** (or your Windows version)

#### Triggers Tab:
- Click **Edit** to verify your schedule
- ✅ Check: **"Enabled"**

#### Actions Tab:
- Verify the action is correct
- Should show: `python.exe email_backup.py`

#### Conditions Tab:
- ⬜ Uncheck: **"Start the task only if the computer is on AC power"**
  (So it runs even on battery)
- ✅ Check: **"Wake the computer to run this task"**
  (Ensures it runs even if PC is sleeping)

#### Settings Tab:
- ✅ Check: **"Allow task to be run on demand"**
- ✅ Check: **"Run task as soon as possible after a scheduled start is missed"**
- ⬜ Uncheck: **"Stop the task if it runs longer than"**
- Set "If the task is already running": **"Do not start a new instance"**

#### Click **OK** to save

---

### Step 7: Enter Your Windows Password

When prompted, enter your Windows user password to allow the task to run when you're not logged in.

---

### Step 8: Test the Task

1. In Task Scheduler, find your task in the list
2. Right-click on **"Dotenv Email Backup"**
3. Click **"Run"**
4. Check your email for the backup!

---

## Troubleshooting

### Task runs but no email received

**Check the task history:**
1. Right-click your task → **Properties**
2. Go to **History** tab
3. Look for errors

**Common issues:**
- Email credentials incorrect in `.env`
- Python path wrong
- "Start in" directory incorrect

**View detailed logs:**
1. Open Task Scheduler
2. Find your task
3. Click on **History** tab at bottom
4. Look for error messages

### Task doesn't run at all

1. Check if task is **Enabled**:
   - Right-click task → **Properties** → **Triggers** tab
   - Ensure trigger is enabled

2. Check if task is set to run when user is not logged on:
   - Right-click task → **Properties** → **General** tab
   - Should say "Run whether user is logged on or not"

3. Verify Windows password was entered correctly:
   - Right-click task → **Properties**
   - Click **OK** and re-enter password

### Python not found error

1. Find correct Python path:
   ```cmd
   where python
   ```

2. Update task action with correct path

### Permission denied error

1. Right-click task → **Properties** → **General** tab
2. Check **"Run with highest privileges"**
3. Click **OK**

---

## Creating Multiple Backup Schedules

You can create multiple tasks for different frequencies:

1. **Daily Backup** - Every day at 2 AM
2. **Weekly Backup** - Every Sunday at 3 AM  
3. **Monthly Backup** - 1st of each month at 4 AM

Just repeat the steps above with different names and schedules!

---

## Viewing Task Output

To see what the script is doing:

### Method 1: Redirect output to log file

1. Edit your task
2. In **Actions** → **Edit**
3. Change **Add arguments** to:
   ```
   email_backup.py >> C:\kumari ai\dotenv-server-master\backup.log 2>&1
   ```

Now check `backup.log` file for output.

### Method 2: Run manually from Command Prompt

```cmd
cd C:\kumari ai\dotenv-server-master
python email_backup.py
```

You'll see all output in the console.

---

## Disabling/Deleting the Task

### To temporarily disable:
1. Right-click task → **Disable**

### To delete:
1. Right-click task → **Delete**
2. Confirm deletion

---

## Quick Reference Card

**Task Name:** Dotenv Email Backup  
**Schedule:** Daily at 2:00 AM  
**Program:** `python.exe`  
**Arguments:** `email_backup.py`  
**Start in:** `C:\kumari ai\dotenv-server-master`  
**Run as:** Your Windows user  
**Privileges:** Highest  

---

## Alternative: Using PowerShell Script

If you prefer, create a `.bat` file for easier management:

**File: `run_backup.bat`**
```batch
@echo off
cd /d "C:\kumari ai\dotenv-server-master"
python email_backup.py >> backup.log 2>&1
```

Then in Task Scheduler:
- **Program/script:** `C:\kumari ai\dotenv-server-master\run_backup.bat`
- **Arguments:** (leave empty)
- **Start in:** `C:\kumari ai\dotenv-server-master`

This creates a log file automatically!

---

## Need Help?

If you encounter issues:

1. Check the backup.log file
2. Verify .env configuration
3. Test email_backup.py manually first
4. Check Task Scheduler History tab
5. Ensure Python and all dependencies are installed
