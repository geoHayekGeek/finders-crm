# Follow-up Viewings Migration Plan

## Overview
Replace "viewing updates" (text-based updates) with "follow-up viewings" (actual viewings linked via parent_viewing_id).

## Changes Required

### Backend
1. ✅ Update model queries to fetch sub-viewings instead of viewing_updates
2. ❌ Remove viewing_updates API endpoints
3. ❌ Update viewing controller to handle follow-up viewings
4. ❌ Add method to get sub-viewings for a viewing

### Frontend
1. ❌ Remove "Update" sections, replace with "Follow-up Viewing" sections
2. ❌ Update TypeScript types (remove ViewingUpdate, keep sub_viewings)
3. ❌ Update UI to display follow-up viewings hierarchically

### Database
- Keep viewing_updates table for now (backward compatibility)
- Focus on using parent_viewing_id for follow-up viewings

