# Test Warning Dataset - README

## Overview
This dataset (`test-warning-dataset.json`) contains **210+ student records** designed to trigger various data quality warnings and errors in the analytics page.

## Data Distribution Breakdown

The dataset is structured to demonstrate three categories in the Data Distribution chart:

### 1. Valid Records (~100-110 records)
- Properly formatted student data
- Valid email addresses
- Appropriate age ranges (18-25)
- Realistic GPA values (0.0-4.0)
- Valid attendance percentages (0-100%)
- Proper date formats
- Valid majors and status values

### 2. Missing Records (~60-70 records)
- Empty string fields (`""`)
- Null values (`null`)
- Undefined values (`undefined`)
- Whitespace-only values (`"   "`)
- Completely empty records

**Examples:**
- Empty student IDs, names, emails
- Null age, GPA, attendance_percentage
- Empty enrollment dates
- Undefined major and status

### 3. Invalid Records (~80-90 records)
- Invalid data types
- Malformed data formats
- Extreme outlier values
- Security injection attempts
- Invalid JavaScript types

**Examples:**
- Invalid emails: `"notanemail"`, `"@domain.com"`, `"email@.com"`
- Wrong types: `"abc"` for age, `"invalid"` for GPA
- Extreme values: Age -99999, GPA 99999.99, Attendance 200%
- Negative values where not allowed
- Special characters: `"###"`, `"!!!"`, SQL injection attempts

## Specific Test Cases Included

### Type Mismatches
- String values in numeric fields
- Numeric values in string fields
- Objects/arrays in primitive fields
- Boolean values in numeric fields
- Function/Error objects in fields

### Range Violations
- Ages: -999 to 999 (normal: 17-26)
- GPA: -999.99 to 999.99 (normal: 0.0-4.0)
- Attendance: -99999.99 to 99999.99 (normal: 0-100%)

### Pattern Violations
- Invalid email formats (no @, multiple @, @ in wrong places)
- Invalid date formats (text instead of dates)
- Invalid grades (numbers, invalid letters)
- Invalid status values

### Missing Data Scenarios
- Completely empty records
- Partial missing data (some fields filled, others empty)
- Mixed null/undefined/empty string

### Security Issues
- SQL injection attempts: `'; DROP TABLE students; --`
- XSS attempts: `<script>alert('xss')</script>`
- Special character attacks
- Unicode/encoding issues

### Extreme Values
- Maximum values: 999, 9999999, etc.
- Minimum values: -999, -9999999, etc.
- Zero values: 0, 0.0
- Infinity/NaN values
- Scientific notation values

## Expected Analytics Results

When processed by the analytics system, this dataset should produce:

### Data Quality Report
- **Overall Score**: D or F grade
- **Completeness**: Low score (~30-40%)
- **Validity**: Low score (~40-50%)
- **Consistency**: Low score (~50-60%)
- **Uniqueness**: Issues with duplicate IDs

### Validation Statistics
- **Total Rows**: ~210
- **Valid Rows**: ~100-110 (47-52%)
- **Warning Count**: ~80-100
- **Error Count**: ~60-80

### Data Distribution Chart
The chart should display three bars:
- **Valid**: Green bar showing ~100-110 records
- **Missing**: Orange bar showing ~60-70 records  
- **Invalid**: Red bar showing ~80-90 records

## Use Cases

This dataset is designed for:
1. Testing data quality validation systems
2. Demonstrating warning display functionality
3. Stress testing analytics components
4. Showing how data distribution visualization handles mixed quality data
5. Educational purposes for data quality concepts

## File Usage

Upload this JSON file to the application to test:
- Data Quality Report component
- Data Distribution chart
- Validation warnings and errors
- Data cleaning recommendations
- Analytics accuracy with poor quality data

## Notes

- Total: 210 student records
- Mix of realistic and extreme edge cases
- Designed to trigger all major validation warnings
- Helps test the complete analytics pipeline end-to-end

