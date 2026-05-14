
// Global State

let arr = [];
let bars = [];
let steps = [];
let animTimer = null;
let running = false;
let comps = 0;
let swaps = 0;

// Algorithm dictionary for the info panel
const ALGOS = {
  bubble:    { name: 'Bubble sort',    desc: 'Repeatedly steps through the list, compares adjacent elements and swaps them if they are in the wrong order. Simple but slow.', best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
  selection: { name: 'Selection sort', desc: 'Finds the minimum element from the unsorted part and puts it at the beginning. Always makes O(n²) comparisons regardless of input.', best: 'O(n²)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
  insertion: { name: 'Insertion sort', desc: 'Builds the sorted array one item at a time. Efficient for small or nearly-sorted datasets. Used as a base case in hybrid sorts like Timsort.', best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
  merge:     { name: 'Merge sort',     desc: 'Divide-and-conquer algorithm. Splits the array in half recursively, then merges sorted halves. Stable and predictably fast.', best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)' },
  quick:     { name: 'Quick sort',     desc: 'Picks a pivot and partitions the array around it. Fast in practice — widely used in standard library sort implementations.', best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)' },
};


// UI Updates & Rendering

function updateAlgoInfo() {
  const algoSelect = document.getElementById('algo').value;
  const a = ALGOS[algoSelect];
  
  document.getElementById('algoInfo').innerHTML = `
    <h3>${a.name}</h3>
    <p>${a.desc}</p>
    <div class="complexity">
      <span class="badge badge-green">Best ${a.best}</span>
      <span class="badge badge-blue">Avg ${a.avg}</span>
      <span class="badge badge-red">Worst ${a.worst}</span>
      <span class="badge badge-blue">Space ${a.space}</span>
    </div>`;
}

// Calculate animation delay based on slider value
function getDelay() { 
  const speed = parseInt(document.getElementById('speedSlider').value);
  return Math.round(600 / (speed * 2 + 1)); 
}

function init() {
  if (animTimer) { 
    clearTimeout(animTimer); 
    animTimer = null; 
  }
  
  running = false;
  const n = parseInt(document.getElementById('sizeSlider').value);
  
  // Generate ordered array and shuffle
  arr = Array.from({length: n}, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  
  // Reset counters and UI
  comps = 0; 
  swaps = 0;
  document.getElementById('compCount').textContent = '0';
  document.getElementById('swapCount').textContent = '0';
  
  const statusEl = document.getElementById('statusText');
  statusEl.textContent = 'Ready';
  statusEl.style.color = 'var(--green)';
  
  document.getElementById('sortBtn').disabled = false;
  render(arr, {});
}

// Map logical states to CSS colors
function colorFor(s) {
  const colors = {
    default: '#4d7fff', 
    compare: '#ff4d6a', 
    swap: '#ffb84d', 
    sorted: '#4dffaa', 
    pivot: '#b84dff'
  };
  return colors[s] || colors.default;
}

function render(a, colorMap) {
  const canvas = document.getElementById('canvas');
  const maxH = 260;
  const n = a.length;
  
  canvas.innerHTML = '';
  bars = [];
  
  a.forEach((v, i) => {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = Math.round((v / n) * maxH) + 'px';
    bar.style.background = colorFor(colorMap[i] || 'default');
    canvas.appendChild(bar);
    bars.push(bar);
  });
}

function updateBars(a, colorMap) {
  const maxH = 260;
  const n = a.length;
  
  bars.forEach((bar, i) => {
    bar.style.height = Math.round((a[i] / n) * maxH) + 'px';
    bar.style.background = colorFor(colorMap[i] || 'default');
  });
}


// Sorting Algorithms (Step Generators)

function bubbleSteps(a, s) {
  const n = a.length;
  const sorted = new Set();
  
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      s.push({type:'compare', a:[...a], i:j, j:j+1, sorted:[...sorted]});
      if (a[j] > a[j+1]) { 
        [a[j], a[j+1]] = [a[j+1], a[j]]; 
        s.push({type:'swap', a:[...a], i:j, j:j+1, sorted:[...sorted]}); 
      }
    }
    sorted.add(n-1-i);
  }
  sorted.add(0);
  s.push({type:'done', a:[...a], sorted:[...Array(n).keys()]});
}

function selectionSteps(a, s) {
  const n = a.length;
  const sorted = new Set();
  
  for (let i = 0; i < n-1; i++) {
    let mi = i;
    for (let j = i+1; j < n; j++) { 
      s.push({type:'compare', a:[...a], i:mi, j:j, sorted:[...sorted]}); 
      if (a[j] < a[mi]) mi = j; 
    }
    if (mi !== i) { 
      [a[i], a[mi]] = [a[mi], a[i]]; 
      s.push({type:'swap', a:[...a], i:i, j:mi, sorted:[...sorted]}); 
    }
    sorted.add(i);
  }
  sorted.add(n-1);
  s.push({type:'done', a:[...a], sorted:[...Array(a.length).keys()]});
}

function insertionSteps(a, s) {
  const n = a.length;
  const sorted = new Set([0]);
  
  for (let i = 1; i < n; i++) {
    let j = i;
    while (j > 0) {
      s.push({type:'compare', a:[...a], i:j-1, j:j, sorted:[...sorted]});
      if (a[j-1] > a[j]) { 
        [a[j-1], a[j]] = [a[j], a[j-1]]; 
        s.push({type:'swap', a:[...a], i:j-1, j:j, sorted:[...sorted]}); 
        j--; 
      } else {
        break;
      }
    }
    sorted.add(i);
  }
  s.push({type:'done', a:[...a], sorted:[...Array(a.length).keys()]});
}

function mergeSteps(a, s) {
  function merge(arr, l, m, r) {
    const left = arr.slice(l, m+1);
    const right = arr.slice(m+1, r+1);
    let i=0, j=0, k=l;
    
    while (i < left.length && j < right.length) {
      s.push({type:'compare', a:[...arr], i:l+i, j:m+1+j, sorted:[]});
      arr[k++] = left[i] <= right[j] ? left[i++] : right[j++];
      s.push({type:'swap', a:[...arr], i:k-1, j:k-1, sorted:[]});
    }
    while (i < left.length) { 
      arr[k++] = left[i++]; 
      s.push({type:'swap', a:[...arr], i:k-1, j:k-1, sorted:[]}); 
    }
    while (j < right.length) { 
      arr[k++] = right[j++]; 
      s.push({type:'swap', a:[...arr], i:k-1, j:k-1, sorted:[]}); 
    }
  }
  
  function ms(arr, l, r) { 
    if(l >= r) return; 
    const m = Math.floor((l+r)/2); 
    ms(arr, l, m); 
    ms(arr, m+1, r); 
    merge(arr, l, m, r); 
  }
  
  ms(a, 0, a.length-1);
  s.push({type:'done', a:[...a], sorted:[...Array(a.length).keys()]});
}

function quickSteps(a, lo, hi, s) {
  if (lo >= hi) return;
  const pv = Math.floor((lo+hi)/2);
  const pivot = a[pv];
  let i = lo, j = hi;
  
  while (i <= j) {
    while (a[i] < pivot) { 
      s.push({type:'compare', a:[...a], i:i, j:pv, pivot:pv, sorted:[]}); 
      i++; 
    }
    while (a[j] > pivot) { 
      s.push({type:'compare', a:[...a], i:pv, j:j, pivot:pv, sorted:[]}); 
      j--; 
    }
    if (i <= j) { 
      [a[i], a[j]] = [a[j], a[i]]; 
      s.push({type:'swap', a:[...a], i:i, j:j, pivot:pv, sorted:[]}); 
      i++; 
      j--; 
    }
  }
  quickSteps(a, lo, j, s);
  quickSteps(a, i, hi, s);
  
  if (lo === 0 && hi === a.length-1) {
    s.push({type:'done', a:[...a], sorted:[...Array(a.length).keys()]});
  }
}

// Map selected string to actual function
function generateSteps(a, algo) {
  const s = [];
  if (algo === 'bubble') bubbleSteps([...a], s);
  else if (algo === 'selection') selectionSteps([...a], s);
  else if (algo === 'insertion') insertionSteps([...a], s);
  else if (algo === 'merge') mergeSteps([...a], s);
  else if (algo === 'quick') quickSteps([...a], 0, a.length-1, s);
  return s;
}


// Main Execution Engine

function startSort() {
  if (running) return; // Prevent double clicks
  running = true;
  
  document.getElementById('sortBtn').disabled = true;
  
  const statusEl = document.getElementById('statusText');
  statusEl.textContent = 'Sorting...';
  statusEl.style.color = 'var(--amber)';
  
  const algo = document.getElementById('algo').value;
  steps = generateSteps(arr, algo);
  
  let stepIdx = 0; 
  comps = 0; 
  swaps = 0;

  function animate() {
    if (stepIdx >= steps.length) { 
      running = false; 
      return; 
    }
    
    const step = steps[stepIdx++];
    const colorMap = {};
    
    if (step.sorted) step.sorted.forEach(i => colorMap[i] = 'sorted');
    if (step.pivot !== undefined) colorMap[step.pivot] = 'pivot';
    
    if (step.type === 'compare') { 
      colorMap[step.i] = 'compare'; 
      colorMap[step.j] = 'compare'; 
      comps++; 
      document.getElementById('compCount').textContent = comps; 
    }
    else if (step.type === 'swap') { 
      colorMap[step.i] = 'swap'; 
      colorMap[step.j] = 'swap'; 
      swaps++; 
      document.getElementById('swapCount').textContent = swaps; 
    }
    else if (step.type === 'done') {
      step.sorted.forEach(i => colorMap[i] = 'sorted');
      statusEl.textContent = 'Done!';
      statusEl.style.color = 'var(--green)';
      document.getElementById('sortBtn').disabled = false;
      running = false;
      updateBars(step.a, colorMap);
      return;
    }
    
    updateBars(step.a, colorMap);
    animTimer = setTimeout(animate, getDelay());
  }

  animate();
}


// Initialization & Event Listeners

document.addEventListener('DOMContentLoaded', () => {
  // Bind UI elements
  document.getElementById('algo').addEventListener('change', updateAlgoInfo);
  
  document.getElementById('sizeSlider').addEventListener('input', (e) => {
    document.getElementById('sizeOut').textContent = e.target.value;
    // Optional: could auto-shuffle when size changes by calling init() here
  });
  
  document.getElementById('shuffleBtn').addEventListener('click', init);
  document.getElementById('sortBtn').addEventListener('click', startSort);

  // Initial render
  updateAlgoInfo();
  init();
});