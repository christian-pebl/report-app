# Claude Assistant Guidelines for Report App Development

## 🚀 Session Startup Instructions

### **Automatic Repository Dashboard**
**When user opens Claude Code, IMMEDIATELY:**

1. **Scan both repositories** (DataApp and report-app) for current status
2. **Generate live repository overview** showing:
   - Current branches and branch status
   - Last 5 commits with dates and branch info
   - Recent activity summary
   - Which repository has most recent work

3. **Present dashboard format:**
```
## 📊 Repository Status Dashboard - christian-pebl Account

### **DataApp Repository**
*github.com/christian-pebl/DataApp*
- Current Branch: [branch] (*)
- Last Activity: [date]
- Recent Focus: [summary of recent commits]

### **report-app Repository** 
*github.com/christian-pebl/report-app*
- Current Branch: [branch] (*)
- Last Activity: [date] 
- Recent Focus: [summary of recent commits]

## Recommendation
Continue working on: [repository with most recent activity or user preference]
```

4. **Ask user:** "Where would you like to continue working today?"

### **Dashboard Commands**
- Use git commands to fetch latest repository information
- Check branch status, recent commits, and activity
- Present concise, actionable overview
- Help user decide which project to work on

---
# Restoring original content...
# Claude Assistant Guidelines for Report App Development

## Universal Project Documentation Requirements

### Essential Project Files
**ALWAYS ensure these files exist in EVERY project:**

1. **PROJECT_REQUIREMENTS.md** or **COMPREHENSIVE_PROJECT_REQUIREMENTS.md**
   - Complete technical specification
   - Feature descriptions and implementation details
   - User interface documentation
   - Data processing workflows
   - Testing requirements

2. **PROJECT_HISTORY.md**
   - Feature development timeline
   - Version history with timestamps
   - Commit hashes and deployment records
   - Testing status and release notes
   - Developer notes and lessons learned

3. **CLAUDE.md** (this file)
   - Development guidelines specific to the project
   - Workflow instructions for feature additions
   - Quality assurance reminders
   - Repository management practices

### When Starting ANY New Project
```markdown
1. Create PROJECT_REQUIREMENTS.md - Document the project purpose, technical specs, and requirements
2. Create PROJECT_HISTORY.md - Track all development milestones and releases
3. Create CLAUDE.md - Establish development guidelines and workflow practices
4. Initialize git repository with proper .gitignore
5. Set up initial project structure and documentation
```

## Project Requirements Management

### New Feature Development Workflow

When implementing new features for the CSV Data Visualization Tool, follow this process:

#### 1. Feature Documentation
- **ALWAYS ask the user** to document new features in the project requirements file
- Update `COMPREHENSIVE_PROJECT_REQUIREMENTS.md` with:
  - Feature description and purpose
  - Technical implementation details
  - User interface changes
  - Data processing modifications
  - Testing requirements

#### 2. Version Control and GitHub Workflow
- **ALWAYS prompt the user** to push to GitHub when a new feature is complete
- Use descriptive commit names with timestamps
- Follow naming convention: `feature-name vX.X: Description - YYYY-MM-DD HH:MM`

Example:
```bash
git commit -m "std-plot-export v1.0: Add PNG export functionality - 2025-01-15 14:30"
```

#### 3. Feature Release Tracking
- Create entries in `PROJECT_HISTORY.md` (create if doesn't exist)
- Document each feature release with:
  - Feature name and version
  - Implementation date and time
  - Commit hash
  - Description of changes
  - Testing status

#### 4. Documentation Requirements
For each new feature, ensure documentation includes:
- **Purpose**: Why the feature was added
- **Implementation**: How it works technically
- **Usage**: How users interact with it
- **Dependencies**: What other systems it affects
- **Testing**: How to verify it works correctly

### Example Feature Documentation Template

```markdown
## Feature: [Feature Name] v[Version] - [YYYY-MM-DD HH:MM]

### Overview
Brief description of the feature and its purpose.

### Technical Implementation
- Code changes made
- New functions/classes added
- Modified existing functionality

### User Interface Changes
- New UI components
- Modified layouts
- Updated user workflows

### Testing
- Test cases covered
- Edge cases considered
- Browser compatibility verified

### Deployment
- Commit hash: [hash]
- GitHub push timestamp: [YYYY-MM-DD HH:MM:SS]
- Release notes: [link or description]
```

### Repository Management
- **Branch Strategy**: Use feature branches for development, merge to main
- **Commit Messages**: Clear, descriptive messages with timestamps
- **Release Tags**: Tag significant releases with version numbers
- **Documentation**: Keep all docs synchronized with code changes

### Quality Assurance Reminders
- Test new features thoroughly before committing
- Ensure backward compatibility
- Update user documentation
- Verify no breaking changes to existing functionality
- Check performance impact

---

## Development Commands Reference

### Testing
```bash
# Check JavaScript syntax
node -c script.js

# Verify file structure
ls -la
```

### Git Workflow
```bash
# Add all changes
git add .

# Commit with timestamp
git commit -m "feature-name vX.X: Description - $(date '+%Y-%m-%d %H:%M')"

# Push to GitHub
git push origin branch-name

# Create release tag
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

### Documentation
```bash
# Update requirements file
# Edit COMPREHENSIVE_PROJECT_REQUIREMENTS.md

# Update feature history
# Edit PROJECT_HISTORY.md

# Commit documentation
git add *.md
git commit -m "docs: Update project requirements for feature X - $(date '+%Y-%m-%d %H:%M')"
```

---

*This file helps ensure consistent development practices and comprehensive documentation for the CSV Data Visualization Tool project.*
## Progress Tracking Guidelines

### When to Use Progress Indicators
For complex, multi-step processes that will take time, **ALWAYS ask the user** if they want a progress bar before starting:

**Complex Process Examples:**
- Multi-file operations (cleanup, refactoring, migration)
- Code generation with multiple steps  
- Database operations or large data processing
- Build processes or deployment sequences
- Testing suites with multiple test files

**Ask Before Starting:**
```
"This is a complex process with X steps that will take some time. 
Would you like me to show a progress bar to track completion?"
```

### Progress Bar Format
When using progress bars, use this format:

```
Progress: [████████████████████░░░░░░░░░░░░░░░░░░░░] 75% (6/8)
Phase: [Current Phase Name]
Status: [Current Action Description]...
```

### TodoWrite Tool Integration
- Use TodoWrite to track progress through complex processes
- Update todo status in real-time (pending → in_progress → completed)
- Mark todos complete immediately after finishing each step
- Provide clear, actionable todo descriptions

### Benefits
- Keeps user informed during long operations
- Builds confidence in the process
- Makes complex tasks feel manageable
- Demonstrates systematic approach

---

## 🚨 CRITICAL DEVELOPMENT RULES

### NEVER Commit Without User Testing First
**NEVER commit or push any code changes without explicit user approval after testing.**

**Required Process:**
1. Make code changes
2. Ask user to test functionality first
3. Wait for user confirmation: "It works, commit it"
4. Only then commit and push

**Why This Rule Exists:**
- User needs to verify changes work in their environment
- Prevents committing broken code
- Maintains user confidence in development process
- Avoids having to revert commits

**What I Just Did Wrong:**
- Made a fix for plot page functionality
- Committed and pushed WITHOUT user testing first
- This violates the testing-first rule

**Correct Workflow:**
```
✅ Make changes
✅ "Please test the plot page now - do the dropdowns work?"
✅ User tests: "Yes, it works!"
✅ Then commit: git commit -m "fix: description"

❌ WRONG: Make changes → commit immediately
```

**Exception:** Only commit without testing for:
- Pure documentation updates
- Comment-only changes
- Non-functional text changes

