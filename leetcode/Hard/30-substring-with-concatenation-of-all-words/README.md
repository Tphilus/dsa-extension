<h2><a href="https://leetcode.com/problems/substring-with-concatenation-of-all-words/submissions/2160044075/">30. Substring with Concatenation of All Words</a></h2>

**Language:** Python3 &nbsp;&nbsp;|&nbsp;&nbsp; **Difficulty:** Hard &nbsp;&nbsp;|&nbsp;&nbsp; **Platform:** LeetCode &nbsp;&nbsp;|&nbsp;&nbsp; **Submitted:** October 2, 2026 at 10:35 AM

---

### 📝 Problem Statement

<div>
<p>You are given a string <code>s</code> and an array of strings <code>words</code>. All the strings of <code>words</code> are of <strong>the same length</strong>.</p>

<p>A <strong>concatenated string</strong> is a string that exactly contains all the strings of any permutation of <code>words</code> concatenated.</p>

<ul>
	<li>For example, if <code>words = ["ab","cd","ef"]</code>, then <code>"abcdef"</code>, <code>"abefcd"</code>, <code>"cdabef"</code>, <code>"cdefab"</code>, <code>"efabcd"</code>, and <code>"efcdab"</code> are all concatenated strings. <code>"acdbef"</code> is not a concatenated string because it is not the concatenation of any permutation of <code>words</code>.</li>
</ul>

<p>Return an array of <em>the starting indices</em> of all the concatenated substrings in <code>s</code>. You can return the answer in <strong>any order</strong>.</p>

<p>&nbsp;</p>
<p><strong class="example">Example 1:</strong></p>

<div class="example-block">
<p><strong>Input:</strong> <span class="example-io">s = "barfoothefoobarman", words = ["foo","bar"]</span></p>

<p><strong>Output:</strong> <span class="example-io">[0,9]</span></p>

<p><strong>Explanation:</strong></p>

<p>The substring starting at 0 is <code>"barfoo"</code>. It is the concatenation of <code>["bar","foo"]</code> which is a permutation of <code>words</code>.<br>
The substring starting at 9 is <code>"foobar"</code>. It is the concatenation of <code>["foo","bar"]</code> which is a permutation of <code>words</code>.</p>
</div>

<p><strong class="example">Example 2:</strong></p>

<div class="example-block">
<p><strong>Input:</strong> <span class="example-io">s = "wordgoodgoodgoodbestword", words = ["word","good","best","word"]</span></p>

<p><strong>Output:</strong> <span class="example-io">[]</span></p>

<p><strong>Explanation:</strong></p>

<p>There is no concatenated substring.</p>
</div>

<p><strong class="example">Example 3:</strong></p>

<div class="example-block">
<p><strong>Input:</strong> <span class="example-io">s = "barfoofoobarthefoobarman", words = ["bar","foo","the"]</span></p>

<p><strong>Output:</strong> <span class="example-io">[6,9,12]</span></p>

<p><strong>Explanation:</strong></p>

<p>The substring starting at 6 is <code>"foobarthe"</code>. It is the concatenation of <code>["foo","bar","the"]</code>.<br>
The substring starting at 9 is <code>"barthefoo"</code>. It is the concatenation of <code>["bar","the","foo"]</code>.<br>
The substring starting at 12 is <code>"thefoobar"</code>. It is the concatenation of <code>["the","foo","bar"]</code>.</p>
</div>

<p>&nbsp;</p>
<p><strong>Constraints:</strong></p>

<ul>
	<li><code>1 &lt;= s.length &lt;= 10<sup>4</sup></code></li>
	<li><code>1 &lt;= words.length &lt;= 5000</code></li>
	<li><code>1 &lt;= words[i].length &lt;= 30</code></li>
	<li><code>s</code> and <code>words[i]</code> consist of lowercase English letters.</li>
</ul>
</div>

---

### 💡 Solution

```python

class Solution:
    def findSubstring(self, s: str, words: List[str]) -> List[int]:
        if not s or not words:
            return []
        
        word_freq = {}
        for word in words:
            word_freq[word] = 1 + word_freq.get(word, 0)

        word_len = len(words[0])
        window_len = len(words) * word_len
        res = []

        for i in range(len(s) - window_len + 1):
            substr_freq = {}
            j = i

            while j < i + window_len:
                cur_word = s[j : j + word_len]

                if cur_word not in word_freq:
                    break
                substr_freq[cur_word] = substr_freq.get(cur_word, 0) + 1

                if substr_freq[cur_word] > word_freq[cur_word]:
                    break
                j += word_len
            
            if j == i + window_len:
                res.append(i)

        return res
```

---

### 📊 Complexity

- **Time:** O(n^2)
- **Space:** O(n)

> _Estimated from a static scan of loop nesting and allocation patterns, not true algorithmic analysis._