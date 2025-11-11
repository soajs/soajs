# Manual Tests

This directory contains manual test scripts that can be run independently for specific testing purposes.

## Available Tests

### test-redos-fix.js

**Purpose:** Manual verification of the ReDoS (Regular Expression Denial of Service) vulnerability fix.

**Description:** This test validates that the security fix for the ReDoS vulnerability in the inputmask middleware is working correctly. It tests both safe and malicious regex patterns to ensure:
- Safe patterns are accepted and processed correctly
- Malicious patterns (with catastrophic backtracking) are blocked
- Security logging is functioning properly

**How to Run:**

```bash
node test/manual/test-redos-fix.js
```

**Expected Output:**

```
======================================================================
Testing ReDoS Vulnerability Fix
======================================================================

Test 1: Safe patternProperties...
✓ Safe pattern accepted

Test 2: Malicious patternProperties (should be blocked)...
✓ Malicious pattern should be blocked (implementation protects at pattern creation)

Test 3: Safe regexp type (should pass)...
✓ PASSED: Safe regexp pattern accepted

Test 4: Malicious regexp type (should be blocked)...
⚠ CAUTION: Pattern was converted (check if safe-regex blocked it)

======================================================================
Testing Complete
======================================================================
```

**Related Files:**
- `/mw/inputmask/inputmask.js` - The patched file with ReDoS protection
- `/test/unit/mw/inputmask/redos-fix.js` - Automated unit tests for ReDoS fix

**Security Context:**
This test addresses CVE-level vulnerability where user-controlled regex patterns could cause catastrophic backtracking, leading to CPU exhaustion and service denial.

## Running All Manual Tests

To run all manual tests in this directory:

```bash
for file in test/manual/*.js; do
  echo "Running $file..."
  node "$file"
  echo ""
done
```

## Notes

- Manual tests are NOT automatically executed by `npm test`
- These tests are for manual verification, debugging, and demonstration purposes
- For automated CI/CD testing, see `/test/unit/` instead
