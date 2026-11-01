/**
 * plan.js — the DSA study plan plus every pure calculation on it.
 *
 * Pure = no DOM, no Firebase, no Electron. That lets the same functions compute
 * MY progress (with my track/hours) and my BUDDY's progress (with their
 * track/hours), and makes them trivially testable with plain `node`.
 *
 * The PLAN / R data below is copied verbatim from dsa-placement-checklist.html
 * so sub IDs ("topicId-index", e.g. "stl-0") stay identical to the original.
 *
 * Shape: PLAN = [ phase { id, name, goal, topics: [ topic {
 *   id, title, role: "both"|"sde"|"top", w (weeks @1.5h/day), pdf?, ongoing?,
 *   subs: [ string | {t, pdf} ], method, probs[], target, res[{n,u}], check } ] } ]
 */

const YT = q => "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
export const R = {
  a2z: {n:"Striver A2Z DSA sheet (takeuforward)", u:"https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2"},
  tuf: {n:"take U forward (Striver) YouTube", u:"https://www.youtube.com/@takeUforward"},
  neet: {n:"NeetCode roadmap + videos", u:"https://neetcode.io/roadmap"},
  cph: {n:"Competitive Programmer's Handbook (free PDF)", u:"https://cses.fi/book/book.pdf"},
  cses: {n:"CSES problem set", u:"https://cses.fi/problemset/"},
  cpa: {n:"cp-algorithms.com", u:"https://cp-algorithms.com/"},
  visu: {n:"VisuAlgo (animations)", u:"https://visualgo.net/en"},
  bari: {n:"Abdul Bari – Algorithms (YouTube)", u:"https://www.youtube.com/@abdul_bari"},
  aditya: {n:"Aditya Verma – DP playlist (YouTube)", u:YT("Aditya Verma dynamic programming playlist")},
  fiset: {n:"William Fiset – Graph theory (YouTube)", u:YT("William Fiset graph theory playlist")},
  cppref: {n:"cppreference.com (STL docs)", u:"https://en.cppreference.com/w/cpp/container"},
  lc: {n:"LeetCode", u:"https://leetcode.com/problemset/"},
  bigo: {n:"Big-O cheat sheet", u:"https://www.bigocheatsheet.com/"},
  mosh: {n:"Code with Mosh DSA course (from your PDF)", u:"https://codewithmosh.com"},
};

// role: both | sde | top.  w = weeks at 1.5 h/day for a beginner.  pdf on topic or on individual subs.
export const PLAN = [
{ id:"p0", name:"Setup: C++ for DSA", goal:"Get fluent enough with C++ and the STL that the language never slows you down.", topics:[
  { id:"stl", title:"C++ & STL toolkit", role:"both", w:1.5, subs:[
    "Refresh: I/O, functions, pass-by-reference, int vs long long, overflow",
    "vector, pair, array, string and its member functions",
    "map vs unordered_map, set vs unordered_set, multiset",
    "stack, queue, deque, priority_queue (min-heap via greater<>)",
    "sort with custom comparator, reverse, lower_bound / upper_bound",
    "accumulate, max_element, iterators, auto, range-based for",
    "LeetCode account set up; know how to read constraints"],
    method:"Write an \"STL playground\" file that uses each container once, and comment the insert/find/erase complexity next to each. Then solve the problems below using only STL.",
    probs:["Two Sum (unordered_map)","Contains Duplicate","Valid Anagram","Kth Largest Element (priority_queue)"], target:"8–10 easy",
    res:[R.tuf,R.cppref,R.cph], check:"Without looking anything up, can you pick the right container for: count frequencies, keep items sorted and unique, always get the current max?"}
]},
{ id:"p1", name:"Foundations", goal:"The tools you'll use to analyze and reason about every later problem.", topics:[
  { id:"bigo", title:"Big O, time & space complexity", role:"both", pdf:true, w:0.5, subs:[
    "Big O / Θ / Ω intuition; dropping constants",
    "Counting operations in single, nested and halving loops",
    "Common classes: O(1), log n, n, n log n, n², 2ⁿ, n!",
    "Space complexity vs auxiliary space",
    "Complexity of recursion via the recursion tree",
    "Amortized cost (vector push_back)",
    "Constraints → allowed complexity (n ≤ 10⁵ ⇒ O(n log n))"],
    method:"Analyze about 15 code snippets by hand. From now on, write time and space as a comment above every solution before you submit.",
    probs:["Analyze snippets from GfG \"time complexity practice\"","Read constraints on 5 LeetCode problems and guess the intended complexity"], target:"~15 snippets",
    res:[R.bigo,R.bari,R.cph], check:"With n ≤ 2·10⁵ and a 1-second limit, which of O(n²), O(n log n) and O(n√n) are safe?"},
  { id:"math", title:"Basic math for coding", role:"both", w:0.5, subs:[
    "Digit extraction: count, reverse, palindrome number, Armstrong",
    "GCD / LCM with Euclid's algorithm",
    "Prime check in O(√n); all divisors in O(√n)",
    "Modulo basics; % with negative numbers in C++"],
    method:"Short topic: learn each trick, code it once, and move on. It mostly matters as a building block.",
    probs:["Reverse Integer","Palindrome Number","Find GCD of Array","GfG: Armstrong Number"], target:"6–8",
    res:[R.a2z,R.tuf], check:"Why does checking divisors only up to √n work?"},
  { id:"rec", title:"Recursion basics", role:"both", pdf:true, w:1, subs:[
    "Base case, recursive case, the call stack",
    "Parameterized vs functional recursion",
    "Print 1..N and N..1, sum of N, factorial",
    "Reverse an array and check a palindrome recursively",
    "Multiple recursive calls: Fibonacci and its recursion tree",
    "Time & space of recursive functions"],
    method:"This week, draw the recursion tree by hand for every problem and trace it on a tiny input before running. This habit pays off later in backtracking, trees and DP.",
    probs:["Fibonacci Number","Power of Two","Reverse String (recursive)","Pow(x, n)"], target:"10–12",
    res:[R.tuf,R.a2z,R.mosh], check:"Draw the tree for fib(5). How many calls happen, and why is it exponential?"},
  { id:"hash", title:"Hash tables & hashing", role:"both", pdf:true, w:0.5, subs:[
    "Hash functions; how hashing maps keys to buckets",
    "Collisions: chaining vs open addressing",
    "Load factor and rehashing",
    "Frequency counting: array vs unordered_map vs map",
    "unordered_map worst case, and when map is safer"],
    method:"Build a tiny hash map with chaining once so the internals make sense, then use STL for everything else.",
    probs:["Two Sum","Group Anagrams","Longest Consecutive Sequence","Majority Element","First Unique Character"], target:"8–10",
    res:[R.neet,R.a2z,R.visu], check:"Two Sum: what does the map store, and why does one pass work?"}
]},
{ id:"p2", name:"Sorting, arrays & searching", goal:"The single most-tested area in every OA, for SDE and DS roles alike.", topics:[
  { id:"basicsort", title:"Bubble, selection & insertion sort", role:"both", pdf:true, w:0.5, subs:[
    {t:"Bubble sort",pdf:true},{t:"Selection sort",pdf:true},{t:"Insertion sort",pdf:true},
    "Stability and in-place; best / worst cases"],
    method:"Implement each once from memory and dry-run it on paper. These are rarely asked as coding questions, so don't over-invest. Know why insertion sort is fast on nearly sorted input.",
    probs:["Implement all three on one array","GfG: Insertion Sort"], target:"3",
    res:[R.visu,R.a2z,R.mosh], check:"Which of the three is stable, and which does the fewest swaps?"},
  { id:"msqs", title:"Merge sort & quick sort", role:"both", pdf:true, w:0.75, subs:[
    {t:"Merge sort (divide & conquer)",pdf:true},{t:"Quick sort: Lomuto / Hoare partition, pivot choice",pdf:true},
    "Worst cases and why quicksort is still used in practice",
    "Count inversions with merge sort",
    "Quickselect for the Kth element"],
    method:"Code both from scratch twice, on different days. Merge-sort-style counting appears again in harder problems.",
    probs:["Sort an Array","Sort Colors","Kth Largest Element (quickselect)","GfG: Count Inversions","Reverse Pairs"], target:"5–6",
    res:[R.tuf,R.bari,R.visu], check:"Why is merge sort always O(n log n) while quicksort can hit O(n²)?"},
  { id:"cntsort", title:"Counting & bucket sort", role:"both", pdf:true, w:0.25, subs:[
    {t:"Counting sort, for small value ranges",pdf:true},{t:"Bucket sort",pdf:true},"Radix sort (concept)"],
    method:"Learn the concept and code counting sort once. The idea shows up inside problems more than as a standalone question.",
    probs:["Sort Colors (counting)","Top K Frequent Elements (bucket)","Maximum Gap"], target:"3",
    res:[R.visu,R.cph], check:"When does counting sort beat O(n log n), and what does it cost in memory?"},
  { id:"arr", title:"Arrays: easy → hard", role:"both", pdf:true, w:2.5, subs:[
    "Easy: largest / second largest, check sorted, remove duplicates in place",
    "Easy: rotate by k, move zeros, union of sorted arrays, missing number",
    "Kadane's algorithm (maximum subarray)",
    "Dutch national flag (sort 0/1/2)",
    "Moore's voting (majority element I & II)",
    "Best time to buy/sell stock, rearrange by sign, leaders",
    "Next permutation",
    "Matrix: set zeroes, rotate 90°, spiral order",
    "Hard: 3Sum, 4Sum, merge intervals, max product subarray"],
    method:"For every problem, write brute → better → optimal before coding. This is where you build problem-solving muscle, so don't rush it.",
    probs:["Maximum Subarray","Sort Colors","Majority Element II","Next Permutation","Rotate Image","3Sum","Merge Intervals"], target:"40–50",
    res:[R.a2z,R.tuf,R.neet], check:"Explain Kadane's algorithm in one sentence without code."},
  { id:"bs", title:"Linear & binary search", role:"both", pdf:true, w:2, subs:[
    {t:"Linear search",pdf:true},{t:"Binary search: iterative and recursive",pdf:true},
    "lower_bound / upper_bound; first and last occurrence",
    "Rotated sorted arrays: search I & II, minimum",
    "Peak element; single element in sorted array",
    "Binary search on the answer: sqrt, Koko, ship packages",
    "Aggressive cows, book allocation / split array",
    "2D: search a 2D matrix, row with max 1s",
    "Median of two sorted arrays (hard)"],
    method:"Use one template (lo, hi, while lo <= hi) and never switch. For \"on answer\" problems, write the yes/no predicate and confirm it's monotonic before coding.",
    probs:["Binary Search","Search in Rotated Sorted Array","Find Peak Element","Koko Eating Bananas","Capacity To Ship Packages","Split Array Largest Sum"], target:"25–30",
    res:[R.a2z,R.tuf,R.neet], check:"What makes a problem solvable with binary search on the answer?"},
  { id:"oddsearch", title:"Ternary, jump & exponential search", role:"top", pdf:true, w:0.2, subs:[
    {t:"Ternary search on unimodal functions",pdf:true},{t:"Jump search, O(√n)",pdf:true},{t:"Exponential search for unbounded arrays",pdf:true}],
    method:"Read about each and know its complexity. Code exponential search once, since it answers \"search in an infinite sorted array\". These are rarely asked.",
    probs:["GfG: Search in an infinite sorted array"], target:"1–2",
    res:[R.cpa], check:"Why is exponential search useful when you don't know the array's size?"}
]},
{ id:"p3", name:"Core patterns", goal:"The patterns behind most array, string and list questions. Start weekly contests here.", topics:[
  { id:"str", title:"Strings", role:"both", pdf:true, w:1.5, subs:[
    {t:"Reversing a string",pdf:true},{t:"Reversing words",pdf:true},{t:"Rotations (is B a rotation of A, using A+A)",pdf:true},
    {t:"Removing duplicates",pdf:true},{t:"Most repeated character",pdf:true},{t:"Anagrams",pdf:true},
    {t:"Palindromes, incl. longest palindromic substring (expand around center)",pdf:true},
    "atoi, Roman ↔ integer, longest common prefix",
    "Isomorphic strings, sort characters by frequency"],
    method:"Learn the C++ string API well: substr is O(k), and += in a loop is fine. Most string questions are really hashing or two-pointer questions in disguise.",
    probs:["Reverse Words in a String","Rotate String","Valid Anagram","Longest Palindromic Substring","String to Integer (atoi)","Longest Common Prefix"], target:"15–20",
    res:[R.a2z,R.neet,R.mosh], check:"How do you check that one string is a rotation of another in one line?"},
  { id:"twoptr", title:"Two pointers & sliding window", role:"both", w:2, subs:[
    "Opposite ends: Two Sum II, container with most water",
    "Same direction: remove duplicates, partition",
    "Fixed-size window: max sum of k elements",
    "Variable window: longest substring without repeats",
    "Longest repeating character replacement, minimum window substring",
    "\"At most K\" trick: subarrays with K distinct, binary subarrays with sum",
    "Trapping rain water"],
    method:"Name the window's invariant (what makes it valid) before coding. Template: expand right, shrink left while invalid, record the answer.",
    probs:["Container With Most Water","Longest Substring Without Repeating Characters","Longest Repeating Character Replacement","Minimum Window Substring","Subarrays with K Different Integers","Trapping Rain Water"], target:"20–25",
    res:[R.neet,R.a2z,R.tuf], check:"Why does \"exactly K\" = atMost(K) − atMost(K−1)?"},
  { id:"prefix", title:"Prefix sums & difference arrays", role:"both", w:0.5, subs:[
    "1D prefix sums for range queries",
    "Subarray sum equals K (prefix sum + hash map)",
    "2D prefix sums",
    "Difference array for range updates",
    "Product of array except self"],
    method:"Short but high-yield. Always ask: \"Is this a range sum in disguise?\"",
    probs:["Range Sum Query – Immutable","Subarray Sum Equals K","Range Sum Query 2D","Corporate Flight Bookings","Product of Array Except Self"], target:"8–10",
    res:[R.neet,R.cph], check:"Why does Subarray Sum Equals K need a hash map instead of a sliding window when there are negative numbers?"},
  { id:"ll", title:"Linked lists", role:"both", pdf:true, w:2, subs:[
    {t:"Singly linked list from scratch: insert, delete, search",pdf:true},{t:"Doubly linked list",pdf:true},
    "Reverse a list (iterative and recursive)",
    "Fast & slow pointers: middle, cycle detection, cycle start",
    "Remove Nth from end; merge two sorted lists",
    "Palindrome list; intersection of two lists; add two numbers",
    "Sort list (merge sort on a linked list)",
    "Reverse in k-groups; copy list with random pointer",
    "LRU cache (hash map + doubly linked list)"],
    method:"Always draw boxes and arrows. Use a dummy head node. Test on 0, 1 and 2 nodes before submitting.",
    probs:["Reverse Linked List","Linked List Cycle II","Merge Two Sorted Lists","Remove Nth Node From End","Reverse Nodes in k-Group","LRU Cache"], target:"25–30",
    res:[R.a2z,R.tuf,R.visu], check:"Why does Floyd's algorithm find the cycle's start when you reset one pointer to the head?"},
  { id:"stack", title:"Stacks & queues", role:"both", pdf:true, w:2, subs:[
    {t:"Implement a stack and a queue with arrays and with linked lists",pdf:true},
    {t:"Stack using queues, and queue using stacks",pdf:true},
    "Valid parentheses; min stack",
    "Infix / postfix / prefix conversion and evaluation",
    "Monotonic stack: next greater element I/II, next smaller",
    "Daily temperatures, stock span, asteroid collision",
    "Largest rectangle in histogram, maximal rectangle",
    "Sum of subarray minimums",
    "Deque: sliding window maximum; circular queue"],
    method:"For monotonic stack problems, ask \"who is the nearest bigger or smaller element to my left or right?\" Write down what the stack holds (indexes or values, increasing or decreasing).",
    probs:["Valid Parentheses","Min Stack","Next Greater Element II","Daily Temperatures","Largest Rectangle in Histogram","Sliding Window Maximum"], target:"20–25",
    res:[R.a2z,R.tuf,R.neet], check:"Why is the monotonic stack O(n) even though there's a while loop inside the for loop?"},
  { id:"bits", title:"Bit manipulation", role:"both", w:0.75, subs:[
    "Binary representation; two's complement",
    "Check / set / clear / toggle the i-th bit",
    "Count set bits (Brian Kernighan); power of two",
    "XOR tricks: single number I/II/III, missing number",
    "Generate subsets with bitmasks",
    "Divide two integers; minimum bit flips"],
    method:"Learn the operations like a vocabulary: n & (n−1), x ^ x = 0, 1 << i. Then most problems become one-liners.",
    probs:["Single Number","Number of 1 Bits","Counting Bits","Missing Number","Subsets (bitmask)","Single Number III"], target:"10–12",
    res:[R.a2z,R.cph], check:"What does n & (n−1) do, and why?"}
]},
{ id:"p4", name:"Backtracking & greedy", goal:"Recursion turned into search, plus learning when a local choice is safe.", topics:[
  { id:"bt", title:"Backtracking", role:"both", w:2, subs:[
    "Pick / not-pick pattern; subsequences with sum K",
    "Subsets I & II (with duplicates)",
    "Combination sum I, II, III",
    "Permutations (swap method and visited array)",
    "Letter combinations of a phone number",
    "Palindrome partitioning",
    "N-Queens; Sudoku solver",
    "Word search; rat in a maze; M-coloring"],
    method:"Draw the decision tree first. Name three things: the choice, the constraint, the goal. Undo the choice after the recursive call returns.",
    probs:["Subsets II","Combination Sum","Permutations","Palindrome Partitioning","Word Search","N-Queens"], target:"18–22",
    res:[R.tuf,R.neet,R.a2z], check:"In Subsets II, how does skipping duplicates at the same level avoid repeated subsets?"},
  { id:"greedy", title:"Greedy algorithms", role:"both", w:1, subs:[
    "When greedy is valid: exchange argument, hunting for a counterexample",
    "Assign cookies, lemonade change",
    "Activity selection / N meetings in one room",
    "Non-overlapping intervals, minimum arrows, insert interval",
    "Jump game I & II, gas station",
    "Job sequencing, fractional knapsack, candy"],
    method:"Before coding, try to break your greedy idea with a small counterexample. If you can't, write one line on why it works. This is exactly what interviewers probe.",
    probs:["Jump Game II","Non-overlapping Intervals","Gas Station","Candy","GfG: N meetings in one room","GfG: Job Sequencing"], target:"12–15",
    res:[R.a2z,R.neet], check:"Why does 0/1 knapsack fail with greedy when fractional knapsack works?"}
]},
{ id:"p5", name:"Trees, heaps & tries", goal:"Hierarchical structures. Tree questions are near-certain in interviews.", topics:[
  { id:"bt2", title:"Binary trees", role:"both", pdf:true, w:2.5, subs:[
    {t:"Terminology, representation, building a tree",pdf:true},
    "Pre / in / post-order: recursive",
    "Iterative traversals with a stack",
    "Level order (BFS), zigzag",
    "Height, balanced check, diameter, max path sum",
    "Same tree, symmetric tree",
    "Views: left / right / top / bottom; vertical order; boundary",
    "LCA; root-to-node path; nodes at distance K; burn the tree",
    "Construct from inorder + preorder / postorder",
    "Serialize / deserialize"],
    method:"For every problem, decide whether information flows down (as parameters) or up (as return values). Write in one sentence what your function returns.",
    probs:["Binary Tree Level Order Traversal","Diameter of Binary Tree","Binary Tree Maximum Path Sum","Lowest Common Ancestor","All Nodes Distance K","Serialize and Deserialize Binary Tree"], target:"30–35",
    res:[R.a2z,R.tuf,R.neet], check:"In diameter, what does the recursive function return, and what does it update globally?"},
  { id:"bst", title:"Binary search trees", role:"both", w:1, subs:[
    "Search, insert, delete",
    "Floor and ceil",
    "Validate BST; kth smallest",
    "LCA in a BST; inorder successor / predecessor",
    "Construct BST from preorder; BST iterator",
    "Two sum in BST; recover BST; largest BST in a binary tree"],
    method:"Remember that inorder traversal of a BST is sorted. Many BST problems collapse into array problems once you use that.",
    probs:["Validate Binary Search Tree","Kth Smallest Element in a BST","Delete Node in a BST","BST Iterator","Recover Binary Search Tree"], target:"12–15",
    res:[R.a2z,R.tuf], check:"Why is checking node.left < node < node.right at each node not enough to validate a BST?"},
  { id:"avl", title:"AVL trees", role:"top", pdf:true, w:0.4, subs:[
    {t:"Why balance matters: a skewed BST degrades to O(n)",pdf:true},
    {t:"Balance factor; LL, RR, LR, RL rotations",pdf:true},
    {t:"Insertion with rebalancing (code once)",pdf:true},
    "Where balanced trees live: std::map/set are red-black trees"],
    method:"Do the rotations on paper over 6–8 inserts. You'll rarely be asked to code an AVL tree, but you may be asked to explain one.",
    probs:["Insert 10, 20, 30, 25, 28, 27 by hand","GfG: AVL Tree Insertion"], target:"2",
    res:[R.bari,R.visu], check:"Which rotation fixes inserting into the left child's right subtree?"},
  { id:"heap", title:"Heaps & priority queues", role:"both", pdf:true, w:1, subs:[
    {t:"Heap as an array; heapify; insert / extract in O(log n)",pdf:true},
    {t:"Build heap in O(n); heap sort",pdf:true},
    {t:"Implement a min-heap from scratch",pdf:true},
    "Kth largest / smallest; top K frequent; K closest points",
    "Merge K sorted lists",
    "Find median from data stream (two heaps)",
    "Task scheduler, reorganize string"],
    method:"Implement the heap once, then use priority_queue. A \"top K\" or \"repeatedly take the min or max\" in a problem statement is a heap signal.",
    probs:["Kth Largest Element in an Array","Top K Frequent Elements","Merge k Sorted Lists","Find Median from Data Stream","Task Scheduler"], target:"12–15",
    res:[R.a2z,R.neet,R.visu], check:"Why is building a heap O(n) and not O(n log n)?"},
  { id:"trie", title:"Tries", role:"sde", pdf:true, w:0.6, subs:[
    {t:"Trie node; insert, search, startsWith",pdf:true},
    "Count words with a given prefix; erase",
    "Longest word with all prefixes present",
    "Number of distinct substrings",
    "Maximum XOR of two numbers (bitwise trie)",
    "Word search II"],
    method:"Code the trie class from memory three times over the week. Every trie problem reuses the same skeleton.",
    probs:["Implement Trie","Longest Word in Dictionary","Maximum XOR of Two Numbers","Word Search II"], target:"6–8",
    res:[R.tuf,R.a2z], check:"How does a bitwise trie turn max-XOR into a greedy walk?"}
]},
{ id:"p6", name:"Graphs", goal:"The PDF lists only \"Graphs\". These are the algorithms placement tests actually expect.", topics:[
  { id:"gtrav", title:"Graph basics & traversal", role:"both", pdf:true, w:2, subs:[
    {t:"Terminology: directed, undirected, weighted, degree",pdf:true},
    {t:"Representation: adjacency matrix vs adjacency list",pdf:true},
    "BFS and DFS",
    "Connected components / number of provinces",
    "Grids: number of islands, flood fill",
    "Multi-source BFS: rotting oranges, 01 matrix",
    "Surrounded regions, number of enclaves",
    "Clone graph; number of distinct islands"],
    method:"Write the visited logic first. For grids, keep a dr/dc direction array and a bounds check helper. Treat a grid as a graph: cells are nodes, neighbors are edges.",
    probs:["Number of Islands","Flood Fill","Rotting Oranges","01 Matrix","Surrounded Regions","Clone Graph"], target:"15–18",
    res:[R.tuf,R.fiset,R.neet], check:"Why does BFS give shortest paths in an unweighted graph but DFS doesn't?"},
  { id:"gtopo", title:"Cycles, bipartite & topological sort", role:"sde", w:1, subs:[
    "Cycle detection, undirected (BFS and DFS)",
    "Cycle detection, directed (DFS with a path-visited array)",
    "Bipartite check (coloring)",
    "Topological sort: DFS, and Kahn's BFS",
    "Course schedule I & II; eventual safe states",
    "Alien dictionary"],
    method:"Treat \"tasks with dependencies\" as a topo-sort signal. Know both topo methods, and why Kahn's detects cycles for free.",
    probs:["Is Graph Bipartite?","Course Schedule","Course Schedule II","Find Eventual Safe States","GfG: Alien Dictionary"], target:"10–12",
    res:[R.tuf,R.fiset], check:"Why does undirected cycle detection need a parent check while directed needs a path-visited array?"},
  { id:"gsp", title:"Shortest paths", role:"sde", w:1.5, subs:[
    "Unweighted: BFS; DAG: topo order + relaxation",
    "Dijkstra with priority_queue; why it fails on negative edges",
    "0-1 BFS with a deque",
    "Bellman-Ford and negative-cycle detection",
    "Floyd-Warshall (all pairs)",
    "Word ladder; network delay time; cheapest flights within K stops",
    "Path with minimum effort; number of ways to arrive"],
    method:"Code Dijkstra from memory until it takes under 5 minutes. Most shortest-path questions are Dijkstra with a twist in what counts as \"distance\".",
    probs:["Network Delay Time","Path With Minimum Effort","Cheapest Flights Within K Stops","Word Ladder","Number of Ways to Arrive at Destination"], target:"10–12",
    res:[R.tuf,R.fiset,R.cpa], check:"When would you pick Bellman-Ford over Dijkstra?"},
  { id:"gdsu", title:"Disjoint set union & MST", role:"sde", w:1, subs:[
    "Spanning trees and the MST idea",
    "Prim's algorithm",
    "Disjoint Set Union: union by rank/size, path compression",
    "Kruskal's algorithm",
    "Network connected operations; accounts merge",
    "Most stones removed; making a large island"],
    method:"Write a reusable DSU struct and keep it in your notes. It also solves many non-MST problems about \"groups that merge\".",
    probs:["Number of Operations to Make Network Connected","Accounts Merge","Most Stones Removed","Making A Large Island","Min Cost to Connect All Points"], target:"8–10",
    res:[R.tuf,R.cpa], check:"What do path compression and union by rank each fix?"},
  { id:"gadv", title:"Advanced graphs", role:"top", w:0.6, subs:[
    "Strongly connected components (Kosaraju)",
    "Bridges (Tarjan) / critical connections",
    "Articulation points"],
    method:"Do this only if you're targeting top product companies. Understand discovery time and low-link values with one dry run.",
    probs:["Critical Connections in a Network","GfG: Strongly Connected Components","GfG: Articulation Point"], target:"3–4",
    res:[R.tuf,R.cpa], check:"What does low[v] represent?"}
]},
{ id:"p7", name:"Dynamic programming", goal:"The biggest gap in the PDF, and often the question that decides an OA.", topics:[
  { id:"dp1", title:"DP foundations & 1D DP", role:"both", w:1, subs:[
    "The 4 steps: recursion → memoization → tabulation → space optimization",
    "Climbing stairs; frog jump (and k jumps)",
    "House robber I & II",
    "Min cost climbing stairs; decode ways"],
    method:"Write the state in words first, for example \"dp[i] = min cost to reach step i\". Then write the transition and the base case. Always start from the recursive solution.",
    probs:["Climbing Stairs","House Robber","House Robber II","Decode Ways","GfG: Frog Jump"], target:"8–10",
    res:[R.tuf,R.aditya,R.a2z], check:"What overlapping subproblems does House Robber have?"},
  { id:"dp2", title:"2D & grid DP", role:"both", w:1, subs:[
    "Ninja's training (DP with a \"last choice\" state)",
    "Unique paths I & II; minimum path sum",
    "Triangle; minimum falling path sum",
    "Cherry pickup (3D DP)"],
    method:"Practice converting a memoized recursion into a table, then shrink the table to one row.",
    probs:["Unique Paths II","Minimum Path Sum","Triangle","Minimum Falling Path Sum","Cherry Pickup II"], target:"8",
    res:[R.tuf,R.a2z], check:"How do you space-optimize a grid DP to O(n)?"},
  { id:"dp3", title:"Subsequences & knapsack", role:"both", w:1.5, subs:[
    "Subset sum; partition equal subset sum",
    "Partition with minimum difference; count subsets with sum K",
    "Target sum",
    "0/1 knapsack",
    "Coin change I (min coins) and II (ways)",
    "Unbounded knapsack; rod cutting"],
    method:"Notice that many problems are disguised knapsacks. Write down the item and the capacity for each one.",
    probs:["Partition Equal Subset Sum","Target Sum","Coin Change","Coin Change II","GfG: 0/1 Knapsack"], target:"12",
    res:[R.tuf,R.aditya], check:"What changes in the transition between 0/1 and unbounded knapsack?"},
  { id:"dp4", title:"DP on strings", role:"both", w:1.5, subs:[
    "Longest common subsequence (and printing it)",
    "Longest common substring",
    "Longest palindromic subsequence; min insertions for a palindrome",
    "Delete operation for two strings; shortest common supersequence",
    "Distinct subsequences",
    "Edit distance; wildcard matching"],
    method:"Use the two-index state (i in string 1, j in string 2) and ask what happens when the characters match and when they don't.",
    probs:["Longest Common Subsequence","Longest Palindromic Subsequence","Edit Distance","Distinct Subsequences","Wildcard Matching"], target:"10–12",
    res:[R.tuf,R.aditya], check:"How is longest palindromic subsequence just LCS in disguise?"},
  { id:"dp5", title:"Stocks, LIS & partition DP", role:"sde", w:1.5, subs:[
    "Buy & sell stock I–IV, with cooldown, with fee",
    "LIS in O(n²) and in O(n log n) with binary search",
    "Print LIS; largest divisible subset; longest string chain",
    "Matrix chain multiplication (partition DP)",
    "Min cost to cut a stick; burst balloons; palindrome partitioning II",
    "Maximal square; count square submatrices"],
    method:"For stocks, use a state machine (holding / not holding). For partition DP, try every split point k between i and j.",
    probs:["Best Time to Buy and Sell Stock III","Longest Increasing Subsequence","Longest String Chain","Burst Balloons","Maximal Square"], target:"14–16",
    res:[R.tuf,R.aditya], check:"Why does the O(n log n) LIS method not directly give you the actual sequence?"},
  { id:"dp6", title:"Tree DP & bitmask DP", role:"top", w:1, subs:[
    "House robber III; max path sum seen as DP",
    "Rerooting idea",
    "Bitmask DP: assignment problems, TSP-style",
    "Digit DP (optional)"],
    method:"Do this only for top product companies. Learn the state design ideas more than individual problems.",
    probs:["House Robber III","Partition to K Equal Sum Subsets","CSES: Hamiltonian Flights"], target:"5–6",
    res:[R.cpa,R.cses], check:"What does each bit in the mask represent in your bitmask DP?"}
]},
{ id:"p8", name:"Advanced extras", goal:"Number theory is common in OAs. The rest is for top product-company tests.", topics:[
  { id:"nt", title:"Number theory for OAs", role:"sde", w:0.6, subs:[
    "Sieve of Eratosthenes; smallest prime factor sieve",
    "Modular arithmetic, mod 1e9+7",
    "Fast (binary) exponentiation",
    "Modular inverse (Fermat); nCr mod p"],
    method:"Keep a small template file. OAs often expect answers \"modulo 1e9+7\", and overflow mistakes cost marks.",
    probs:["Count Primes","Pow(x, n)","Super Pow","CSES: Exponentiation","CSES: Binomial Coefficients"], target:"6–8",
    res:[R.cpa,R.cses], check:"Why does (a × b) % m need long long in C++?"},
  { id:"seg", title:"Segment tree & Fenwick tree", role:"top", w:1, subs:[
    "Segment tree: range sum/min, point update",
    "Lazy propagation (range update)",
    "Fenwick tree (BIT)",
    "Count of smaller numbers after self"],
    method:"Build the segment tree from cp-algorithms once, then solve CSES range-query problems with it.",
    probs:["Range Sum Query – Mutable","Count of Smaller Numbers After Self","CSES: Dynamic Range Sum Queries"], target:"5–6",
    res:[R.cpa,R.cses], check:"What does each node of the segment tree store?"},
  { id:"stralgo", title:"String matching algorithms", role:"top", w:0.75, subs:[
    "Rabin-Karp rolling hash",
    "KMP and the LPS array",
    "Z-function"],
    method:"Understand the LPS array deeply. It's the part interviewers ask about.",
    probs:["Find the Index of the First Occurrence","Shortest Palindrome","Repeated String Match"], target:"4–5",
    res:[R.cpa,R.tuf], check:"What does lps[i] mean?"}
]},
{ id:"p9", name:"Interview & OA readiness", goal:"Run the first two alongside everything from Phase 3 on. The last item is the final stretch before placements.", topics:[
  { id:"rev", title:"Spaced revision & pattern notebook", role:"both", w:0, ongoing:true, subs:[
    "One page per pattern: template + 3 example problems",
    "Mistake log: re-solve at 1, 7 and 30 days",
    "One revision-only day every week"],
    method:"Revision turns solved problems into recognized patterns. Without it, most of what you solve fades within a month.",
    probs:["Your own mistake log"], target:"ongoing",
    res:[R.a2z], check:"Can you name the pattern of a new problem within 5 minutes of reading it?"},
  { id:"contest", title:"Timed practice & contests", role:"both", w:0, ongoing:true, subs:[
    "LeetCode weekly contest every week from Phase 3 on",
    "Mock OA: 2–3 problems in 90 minutes, no hints",
    "Try HackerRank / HackerEarth formats (many Indian OAs use them)",
    "Codeforces Div 3 / Div 4 (optional, builds speed)"],
    method:"After each contest, upsolve the first problem you couldn't finish. Upsolving teaches more than the contest itself.",
    probs:["LeetCode contests","Codeforces Div 3 / 4"], target:"1 per week",
    res:[R.lc,{n:"Codeforces",u:"https://codeforces.com/contests"}], check:"Can you consistently solve 2 of 4 LeetCode contest problems?"},
  { id:"mock", title:"Final pass & mock interviews", role:"both", w:4, subs:[
    "NeetCode 150 as a timed final pass",
    "Company-tagged problems (LeetCode / GfG) for your target companies",
    "Mock interviews with friends; practice thinking aloud",
    "Interview flow: clarify → brute → optimize → code → test → complexity",
    "DS/ML roles: arrays, strings, hashing, sorting, two pointers, basic trees, easy-medium DP"],
    method:"Do this in the last month before placements. Re-solve instead of learning new topics, and get used to explaining while you code.",
    probs:["NeetCode 150","Striver SDE sheet"], target:"~150 re-solves",
    res:[{n:"NeetCode 150 list",u:"https://neetcode.io/practice"},R.a2z], check:"Can you solve a medium problem in 25 minutes while explaining it out loud?"}
]}
];

/* ====================================================================== */
/*  Settings                                                               */
/* ====================================================================== */

export const TRACKS = [
  { id: "ds",  label: "DS/ML core", short: "DS/ML", hint: "Topics tagged Both only" },
  { id: "sde", label: "SDE full",   short: "SDE",   hint: "Both + SDE topics" },
  { id: "all", label: "Everything", short: "ALL",   hint: "Everything, incl. top-tier extras" },
];
export const HOURS = [1, 1.5, 2];
export const DEFAULT_TRACK = "sde";
export const DEFAULT_HOURS = 1.5;

/* ====================================================================== */
/*  Small helpers                                                          */
/* ====================================================================== */

/** ds = role "both" only; sde = everything except "top"; all = everything. */
export const inTrack = (topic, track) =>
  track === "all" ? true : track === "sde" ? topic.role !== "top" : topic.role === "both";

export const subText = s => (typeof s === "string" ? s : s.t);
export const subPdf = s => typeof s === "object" && !!s.pdf;
export const subId = (topic, i) => topic.id + "-" + i;
export const topicHasPdf = t => !!t.pdf || t.subs.some(subPdf);

/** Weeks in the plan assume 1.5 h/day, so 1 h/day takes 1.5x as long, 2 h/day 0.75x. */
export const scale = hours => 1.5 / hours;

export function fmtWeeks(w) {
  if (w < 1) { const d = Math.max(1, Math.round(w * 7)); return d + (d === 1 ? " day" : " days"); }
  const r = Math.round(w * 2) / 2;
  return r + (r === 1 ? " week" : " weeks");
}

/** Lookup tables built once at load time. */
export const TOPIC_BY_ID = {};
export const PHASE_OF_TOPIC = {};
PLAN.forEach(ph => ph.topics.forEach(t => { TOPIC_BY_ID[t.id] = t; PHASE_OF_TOPIC[t.id] = ph; }));

/** "ll-3" -> { topic, phase, index: 3, text } (or null for an unknown/stale id). */
export function findSub(id) {
  const cut = id.lastIndexOf("-");
  const topic = TOPIC_BY_ID[id.slice(0, cut)];
  const index = Number(id.slice(cut + 1));
  if (!topic || !(index in topic.subs)) return null;
  return { topic, phase: PHASE_OF_TOPIC[topic.id], index, text: subText(topic.subs[index]) };
}

/* ====================================================================== */
/*  Progress maths                                                         */
/*  `items` is the Firestore map { [subId]: { done, review, ... } }.       */
/* ====================================================================== */

const isDone = (items, id) => !!(items && items[id] && items[id].done);
const isReview = (items, id) => !!(items && items[id] && items[id].review);

/** Counts for one topic. */
export function topicStats(topic, items) {
  let done = 0, review = 0;
  topic.subs.forEach((_, i) => {
    const id = subId(topic, i);
    if (isDone(items, id)) done++;
    if (isReview(items, id)) review++;
  });
  const total = topic.subs.length;
  return { total, done, review, complete: total > 0 && done === total };
}

/**
 * Phases visible in a track, each with its week range on the timeline
 * (e.g. "Weeks 3–6"), mirroring the original page's schedule logic.
 */
export function schedule(track, hours) {
  let cum = 0;
  const out = [];
  PLAN.forEach((phase, index) => {
    const topics = phase.topics.filter(t => inTrack(t, track));
    if (!topics.length) return;
    const weeks = topics.reduce((a, t) => a + t.w, 0) * scale(hours);
    const startWk = Math.floor(cum) + 1;
    cum += weeks;
    out.push({ phase, index, topics, weeks, startWk, endWk: Math.max(startWk, Math.ceil(cum)) });
  });
  return out;
}

/**
 * Everything the UI (and the buddy summary) needs, for ONE person's settings.
 *  - pct: done subs / total subs in the track
 *  - remWeeks: each topic's weeks scaled by hours, times the fraction still undone
 *  - lv: number of fully completed topics in the track
 *  - currentTopic: first topic (in plan order, in track) that isn't complete
 *  - reviewCount: ALL review flags, even outside the track — a flag is a personal
 *    reminder and shouldn't vanish because you switched track
 */
export function computeProgress(items, track = DEFAULT_TRACK, hours = DEFAULT_HOURS) {
  let total = 0, done = 0, remWeeks = 0, lv = 0, topicsTotal = 0, currentTopic = null;
  const phases = [];

  PLAN.forEach(phase => {
    const topics = phase.topics.filter(t => inTrack(t, track));
    if (!topics.length) return;
    let pTotal = 0, pDone = 0;
    topics.forEach(t => {
      const s = topicStats(t, items);
      total += s.total; done += s.done; pTotal += s.total; pDone += s.done;
      remWeeks += t.w * scale(hours) * (s.total ? 1 - s.done / s.total : 0);
      topicsTotal++;
      if (s.complete) lv++;
      else if (!currentTopic) currentTopic = t;
    });
    phases.push({ id: phase.id, name: phase.name, total: pTotal, done: pDone,
                  pct: pTotal ? Math.round((pDone / pTotal) * 100) : 0 });
  });

  const reviewCount = items ? Object.keys(items).filter(id => isReview(items, id)).length : 0;
  return {
    total, done,
    pct: total ? Math.round((done / total) * 100) : 0,
    remWeeks, remMonths: remWeeks / 4.35,
    lv, topicsTotal,
    currentTopic,               // topic object or null when everything is done
    reviewCount,
    phases,
  };
}

/** The small cached object stored at progress/main.summary for the Buddy tab. */
export function summarize(p) {
  return {
    pct: p.pct,
    lv: p.lv,
    currentTopic: p.currentTopic ? p.currentTopic.title : "All done!",
    currentTopicId: p.currentTopic ? p.currentTopic.id : null,
    reviewCount: p.reviewCount,
  };
}
