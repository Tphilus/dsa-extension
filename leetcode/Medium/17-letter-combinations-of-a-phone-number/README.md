<h2><a href="https://leetcode.com/problems/letter-combinations-of-a-phone-number/submissions/2160059278/">17. Letter Combinations of a Phone Number</a></h2>

**Language:** Python3 &nbsp;&nbsp;|&nbsp;&nbsp; **Difficulty:** Medium &nbsp;&nbsp;|&nbsp;&nbsp; **Platform:** LeetCode &nbsp;&nbsp;|&nbsp;&nbsp; **Submitted:** October 2, 2026 at 10:55 AM

---

### 📝 Problem Statement

<div>
<p>Given a string containing digits from <code>2-9</code> inclusive, return all possible letter combinations that the number could represent. Return the answer in <strong>any order</strong>.</p>

<p>A mapping of digits to letters (just like on the telephone buttons) is given below. Note that 1 does not map to any letters.</p>
<img alt="" src="https://assets.leetcode.com/uploads/2022/03/15/1200px-telephone-keypad2svg.png" style="width: 300px; height: 243px;">
<p>&nbsp;</p>
<p><strong class="example">Example 1:</strong></p>

<pre><strong>Input:</strong> digits = "23"
<strong>Output:</strong> ["ad","ae","af","bd","be","bf","cd","ce","cf"]
</pre>

<p><strong class="example">Example 2:</strong></p>

<pre><strong>Input:</strong> digits = "2"
<strong>Output:</strong> ["a","b","c"]
</pre>

<p>&nbsp;</p>
<p><strong>Constraints:</strong></p>

<ul>
	<li><code>1 &lt;= digits.length &lt;= 4</code></li>
	<li><code>digits[i]</code> is a digit in the range <code>['2', '9']</code>.</li>
</ul>
</div>

---

### 💡 Solution

```python

class Solution:
    def letterCombinations(self, digits: str) -> List[str]:
        if not digits:
            return []
        
        digit_to_letters = {
            '2': 'abc',
            '3': 'def',
            '4': 'ghi',
            '5': 'jkl',
            '6': 'mno',
            '7': 'pqrs',
            '8': 'tuv',
            '9': 'wxyz',
        }

        def backtrack(idx, comb):
            if idx == len(digits):
                res.append(comb[:])
                return
            
            for letter in digit_to_letters[digits[idx]]:
                backtrack(idx + 1, comb + letter)

        res = []
        backtrack(0, "")

        return res
```

---

### 📊 Complexity

- **Time:** O(n)
- **Space:** O(1)

> _Estimated from a static scan of loop nesting and allocation patterns, not true algorithmic analysis._