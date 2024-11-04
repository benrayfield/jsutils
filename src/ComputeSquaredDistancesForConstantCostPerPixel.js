//Opensource MIT licensed by Ben F Rayfield, that returns int array, 1 int per pixel,
//of distance squared to nearest voxel, of sparse voxels, in average constant time per pixel.
const computeSquaredDistances = (sideBits, voxelYs, voxelXs) => {
  // Ensure sideBits does not exceed 15 to prevent integer overflow in squared distances
  if (sideBits > 15) throw new Error('sideBits must be <= 15');

  const side = 1 << sideBits;           // Compute side length (e.g., 512 for sideBits=9)
  const size = side * side;             // Total number of pixels in the grid

  // Initialize presence array: 1 where voxel exists, else 0
  const presence = new Uint8Array(size);
  for (let i = 0; i < voxelYs.length; i++) {
    const y = voxelYs[i];
    const x = voxelXs[i];
    if (y >= 0 && y < side && x >= 0 && x < side) {
      presence[(y << sideBits) | x] = 1; // Bitwise indexing for faster computation
    }
  }

  const INF = 0x7FFFFFFF;                // Representation of infinity for distances
  const distRow = new Int32Array(size);   // Intermediate distance array after row-wise transform
  const finalDist = new Int32Array(size); // Final distance array after column-wise transform

  // Initialize distRow: 0 for voxels, INF otherwise
  for (let i = 0; i < size; i++) {
    distRow[i] = presence[i] ? 0 : INF;
  }

  /**
   * Row-wise Distance Transform (Two Passes: Forward and Backward)
   * Optimized for cache locality by accessing memory sequentially.
   */
  for (let y = 0; y < side; y++) {
    const rowOffset = y << sideBits; // Compute row offset using bitwise shift (y * side)

    // Forward Pass: Left to Right
    let lastVoxelX = -INF;
    for (let x = 0; x < side; x++) {
      const idx = rowOffset | x; // Bitwise OR for faster index computation
      if (presence[idx] === 1) {
        lastVoxelX = x;
        distRow[idx] = 0; // Distance to itself is 0
      } else if (lastVoxelX !== -INF) {
        const dx = x - lastVoxelX;
        const dxSq = Math.imul(dx, dx); // Accurate computation of dx²
        if (dxSq < distRow[idx]) {
          distRow[idx] = dxSq; // Update distance if smaller
        }
      }
    }

    // Backward Pass: Right to Left
    lastVoxelX = -INF;
    for (let x = side - 1; x >= 0; x--) {
      const idx = rowOffset | x;
      if (presence[idx] === 1) {
        lastVoxelX = x;
        distRow[idx] = 0;
      } else if (lastVoxelX !== -INF) {
        const dx = lastVoxelX - x;
        const dxSq = Math.imul(dx, dx);
        if (dxSq < distRow[idx]) {
          distRow[idx] = dxSq;
        }
      }
    }
  }

  // Initialize finalDist as a copy of distRow
  for (let i = 0; i < size; i++) {
    finalDist[i] = distRow[i];
  }

  /**
   * Column-wise Distance Transform (Two Passes: Forward and Backward)
   * Implements the Felzenszwalb and Huttenlocher 1D Distance Transform for each column.
   * This ensures accurate computation of squared Euclidean distances.
   */

  /**
   * Helper function to compute the 1D squared distance transform.
   * Implements the algorithm by Felzenszwalb and Huttenlocher (2004).
   * @param {Int32Array} f - The input array representing squared horizontal distances.
   * @param {number} n - The length of the input array.
   * @returns {Int32Array} - The output array representing squared Euclidean distances.
   */
  const distanceTransform1D = (f, n) => {
    const d = new Int32Array(n);
    const v = new Int32Array(n);
    const z = new Float32Array(n + 1);
    let k = 0;
    v[0] = 0;
    z[0] = -Infinity;
    z[1] = +Infinity;

    for (let q = 1; q < n; q++) {
      let s;
      do {
        const i = v[k];
        // Compute the intersection point between the parabola at i and q
        s = ((f[q] + Math.imul(q, q)) - (f[i] + Math.imul(i, i))) / (2 * q - 2 * i);
        if (s <= z[k]) {
          k--;
        } else {
          break;
        }
      } while (k >= 0);

      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = +Infinity;
    }

    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k + 1] < q) {
        k++;
      }
      const i = v[k];
      d[q] = Math.imul(q - i, q - i) + f[i];
    }

    return d;
  };

  // Perform column-wise distance transform using the 1D distance transform
  for (let x = 0; x < side; x++) {
    // Extract the column's row-wise distances
    const f = new Int32Array(side);
    for (let y = 0; y < side; y++) {
      const idx = (y << sideBits) | x;
      f[y] = distRow[idx];
    }

    // Compute the 1D distance transform for the column
    const dt = distanceTransform1D(f, side);

    // Update the finalDist array with the computed distances
    for (let y = 0; y < side; y++) {
      const idx = (y << sideBits) | x;
      finalDist[idx] = dt[y];
    }
  }

  return finalDist; // Return the final squared distance array
};
