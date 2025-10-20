# Lead Referrals - User Guide

## What's New? 🎉

The Lead Referrals feature now has a **beautiful new interface** that matches the Property Referrals system, with support for both **Employee** and **Custom** referrals!

## Quick Start

### Step 1: Open the Referrals Selector

When creating or editing a lead, find the **Referrals** field:

```
┌─────────────────────────────────────────────┐
│ 👥 Referrals (optional)                     │
├─────────────────────────────────────────────┤
│ 👥 Add lead referrals...              [0]   │ ← Click here
└─────────────────────────────────────────────┘
```

### Step 2: Click "Add Referral"

A dropdown panel will appear with an **"Add Referral"** button in the header.

```
┌─────────────────────────────────────────────┐
│ Referrals                   [+ Add Referral]│
├─────────────────────────────────────────────┤
│                                             │
│   No referrals added yet                    │
│   Click "Add Referral" to get started       │
│                                             │
└─────────────────────────────────────────────┘
```

### Step 3: Choose Referral Type

Two options appear:

```
┌─────────────────────────────────────────────┐
│  [Employee] [Custom]                        │
└─────────────────────────────────────────────┘
```

## Adding an Employee Referral

**Employee referrals** are for internal agents who referred the lead.

1. Select **"Employee"** (it's selected by default)
2. Choose an agent from the dropdown:
   ```
   ┌───────────────────────────────────────┐
   │ Select an agent...               ▼    │
   ├───────────────────────────────────────┤
   │ John Smith (agent)                    │
   │ Sarah Johnson (agent)                 │
   │ Mike Williams (team_leader)           │
   └───────────────────────────────────────┘
   ```
3. Select the referral date (defaults to today)
4. Click **"Add Referral"**

Result:
```
┌───────────────────────────────────────────────────┐
│ 📘 John Smith                      [📅] [X]      │
│    📅 10/19/2025  [Employee]                      │
└───────────────────────────────────────────────────┘
```
- Blue badge and icon for employees
- Shows agent name
- Date is editable inline
- X button to delete

## Adding a Custom Referral

**Custom referrals** are for external people (not employees) who referred the lead.

1. Select **"Custom"**
2. Type the person's name:
   ```
   ┌───────────────────────────────────────┐
   │ Enter custom referral name            │
   └───────────────────────────────────────┘
   ```
3. Select the referral date
4. Click **"Add Referral"**

Result:
```
┌───────────────────────────────────────────────────┐
│ 📗 Jane Doe (External)             [📅] [X]      │
│    📅 10/19/2025  [Custom]                        │
└───────────────────────────────────────────────────┘
```
- Green badge and icon for custom referrals
- Shows custom name
- Date is editable inline
- X button to delete

## Managing Referrals

### Editing a Referral Date

Click on the date picker next to any referral:

```
┌───────────────────────────────────────────────────┐
│ 📘 John Smith              [📅 10/19/2025] [X]   │ ← Click date
│    📅 10/19/2025  [Employee]                      │
└───────────────────────────────────────────────────┘
```

Select a new date from the calendar picker.

### Deleting a Referral

Click the **X** button next to any referral:

```
┌───────────────────────────────────────────────────┐
│ 📘 John Smith              [📅 10/19/2025] [X]   │ ← Click X
│    📅 10/19/2025  [Employee]                      │
└───────────────────────────────────────────────────┘
```

The referral is removed immediately.

## Multiple Referrals

You can add **multiple referrals** to a single lead:

```
┌───────────────────────────────────────────────────┐
│ Referrals                           [+ Add Referral]
├───────────────────────────────────────────────────┤
│ Current Referrals                                 │
│                                                   │
│ ┌─────────────────────────────────────────────┐  │
│ │ 📘 John Smith          [📅 10/19/2025] [X] │  │
│ │    📅 10/19/2025  [Employee]                │  │
│ └─────────────────────────────────────────────┘  │
│                                                   │
│ ┌─────────────────────────────────────────────┐  │
│ │ 📗 Jane Doe            [📅 10/18/2025] [X] │  │
│ │    📅 10/18/2025  [Custom]                  │  │
│ └─────────────────────────────────────────────┘  │
│                                                   │
│ ┌─────────────────────────────────────────────┐  │
│ │ 📘 Sarah Johnson       [📅 10/15/2025] [X] │  │
│ │    📅 10/15/2025  [Employee]                │  │
│ └─────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────┘
```

The main input shows the total count:
```
┌─────────────────────────────────────────────┐
│ 👥 3 referrals selected              [3]    │
└─────────────────────────────────────────────┘
```

## Visual Guide

### Color Coding

| Type | Color | Icon | Badge |
|------|-------|------|-------|
| Employee | 🔵 Blue | 📘 | `[Employee]` |
| Custom | 🟢 Green | 📗 | `[Custom]` |

### Icons

- 👥 **Referrals** - Main field icon
- 📅 **Calendar** - Date picker
- ➕ **Plus** - Add referral button
- ❌ **X** - Delete button
- 📘 **Blue user** - Employee referral
- 📗 **Green user** - Custom referral

## Use Cases

### Scenario 1: Agent-to-Agent Referral
An agent refers a lead to another agent within your company.
- **Use**: Employee Referral
- **Why**: Tracks commission eligibility

### Scenario 2: External Referral
A client or external partner refers a lead.
- **Use**: Custom Referral
- **Why**: Tracks source but no commission

### Scenario 3: Mixed Referrals
A lead comes from multiple sources.
- **Use**: Both Employee and Custom
- **Why**: Complete referral history

## Permissions

### Who can add/edit/delete referrals?
- ✅ Admin
- ✅ Operations
- ✅ Operations Manager
- ✅ Agent Manager

### Who can view referrals?
- ✅ Everyone with lead viewing permissions

## Tips & Tricks

1. **Default Date**: The referral date defaults to today, but you can change it to any past date.

2. **Quick Add**: The form remembers your last selection (Employee/Custom) for faster entry.

3. **Inline Edit**: No need to delete and recreate - just edit the date directly.

4. **Visual Feedback**: The count badge updates immediately when you add/remove referrals.

5. **Click Outside**: Click anywhere outside the dropdown to close it.

## Automatic Referrals

When you assign an agent to a lead, a referral is **automatically created**:

- ✅ Agent's name is captured
- ✅ Date is set to assignment date
- ✅ Type is set to Employee
- ✅ Shows up in the referrals list

## The 1-Month Rule

When a lead is **reassigned** to a different agent:

### Within 1 Month
```
Day 1:  Lead assigned to Agent A (Internal referral ✅)
Day 15: Lead reassigned to Agent B
Result: Agent A keeps internal status (can earn commission)
```

### After 1 Month
```
Day 1:  Lead assigned to Agent A (Internal referral ✅)
Day 35: Lead reassigned to Agent B
Result: Agent A marked as external ⚠️ (no commission)
```

This is **automatic** - you don't need to do anything!

## FAQ

**Q: What's the difference between Employee and Custom?**
A: Employee referrals are from internal agents and track commission eligibility. Custom referrals are from external sources and are for tracking only.

**Q: Can I add multiple referrals?**
A: Yes! You can add as many as needed.

**Q: Can I delete a referral after saving?**
A: Yes, but only if you have the required permissions.

**Q: Does the referral date matter?**
A: Yes! The date is used for the 1-month rule and commission calculations.

**Q: Can I add a referral without an agent?**
A: Yes, use Custom referral for non-employee referrers.

**Q: Why is my referral marked as "external"?**
A: This happens automatically when the 1-month rule is triggered by a lead reassignment.

## Need Help?

If you encounter any issues:
1. Check your permissions
2. Verify the agent is in the system (for Employee referrals)
3. Make sure the date is valid
4. Contact your system administrator

## Summary

✅ Beautiful new UI
✅ Employee + Custom referrals
✅ Easy to add, edit, delete
✅ Visual badges for clarity
✅ Automatic referral tracking
✅ Commission tracking for employees
✅ Complete referral history

Enjoy the new Lead Referrals system! 🎉


