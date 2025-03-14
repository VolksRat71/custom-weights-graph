import React, { useState, useRef, useEffect, useMemo } from 'react';

const WeightDistributionEditor = () => {
  const [items, setItems] = useState([
    { id: 1, name: 'Creative 1', weight: 50, locked: false },
    { id: 2, name: 'Creative 2', weight: 25, locked: false },
    { id: 3, name: 'Creative 3', weight: 21, locked: false },
    { id: 4, name: 'Creative 4', weight: 4, locked: false },
  ]);

  const [activePointIndex, setActivePointIndex] = useState(null);
  const [draggedItemId, setDraggedItemId] = useState(null);
  const [dragOverItemId, setDragOverItemId] = useState(null);
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate total only when weights change to prevent unnecessary re-renders
  const total = useMemo(() => {
    return items.reduce((acc, item) => acc + item.weight, 0);
  }, [items]);

  // Check if any items are locked
  const hasLockedItems = useMemo(() => {
    return items.some(item => item.locked);
  }, [items]);

  // Significant deviation to show warning (more than 1%)
  const hasSignificantDeviation = Math.abs(total - 100) > 1;

  // Normalize weights to ensure they sum to 100%
  const normalizeWeights = (newItems) => {
    // Get sum of all weights
    const sum = newItems.reduce((acc, item) => acc + item.weight, 0);
    if (sum === 0) return newItems;

    // Count locked items and their total weight
    const lockedItems = newItems.filter(item => item.locked);
    const lockedWeight = lockedItems.reduce((acc, item) => acc + item.weight, 0);

    // If all items are locked or the locked weight is already 100%, return as is
    if (lockedItems.length === newItems.length || lockedWeight >= 100) {
      return newItems;
    }

    // Get unlocked items
    const unlockedItems = newItems.filter(item => !item.locked);

    // Calculate how much weight to distribute among unlocked items
    const availableWeight = 100 - lockedWeight;

    // If there's only one unlocked item, it gets all the available weight
    if (unlockedItems.length === 1) {
      return newItems.map(item =>
        !item.locked ? { ...item, weight: availableWeight } : item
      );
    }

    // Otherwise, distribute proportionally among unlocked items
    const unlockedWeight = unlockedItems.reduce((acc, item) => acc + item.weight, 0);

    // If unlocked weight is 0, distribute evenly
    if (unlockedWeight === 0) {
      const equalShare = Math.floor(availableWeight / unlockedItems.length);
      let remainder = availableWeight - (equalShare * unlockedItems.length);

      return newItems.map(item => {
        if (item.locked) return item;

        // Add one extra to early items if there's a remainder
        let extraWeight = 0;
        if (remainder > 0) {
          extraWeight = 1;
          remainder--;
        }

        return { ...item, weight: equalShare + extraWeight };
      });
    }

    // Otherwise distribute proportionally
    return newItems.map(item => {
      if (item.locked) return item;

      // Calculate proportional share
      const proportion = item.weight / unlockedWeight;
      return {
        ...item,
        weight: Math.round(availableWeight * proportion)
      };
    });
  };

  // Apply even distribution to all unlocked items
  const applyEvenDistribution = () => {
    // Count locked items and calculate their total weight
    const lockedItems = items.filter(item => item.locked);
    const lockedWeight = lockedItems.reduce((acc, item) => acc + item.weight, 0);

    // Calculate available weight for unlocked items
    const availableWeight = 100 - lockedWeight;

    // Count unlocked items
    const unlockedCount = items.length - lockedItems.length;

    if (unlockedCount === 0) return; // Edge case: all items locked

    // Calculate equal share with handling for remainders
    const equalShare = Math.floor(availableWeight / unlockedCount);
    let remainder = availableWeight - (equalShare * unlockedCount);

    // Apply the distribution
    const newItems = items.map(item => {
      if (item.locked) return item;

      // Add one extra to early items if there's a remainder
      let weight = equalShare;
      if (remainder > 0) {
        weight += 1;
        remainder--;
      }

      return { ...item, weight };
    });

    setItems(newItems);
  };

  // Apply bell curve distribution (normal distribution)
  const applyBellCurve = () => {
    const unlocked = items.filter(item => !item.locked);
    const locked = items.filter(item => item.locked);
    const lockedWeight = locked.reduce((acc, item) => acc + item.weight, 0);

    if (unlocked.length === 0) return; // All items are locked

    const availableWeight = 100 - lockedWeight;
    const center = (unlocked.length - 1) / 2;
    const stdDev = unlocked.length / 2.5; // Make the curve cover most of the items

    // Calculate the bell curve values
    const bellValues = unlocked.map((_, index) => {
      // Normal distribution formula
      return Math.exp(-0.5 * Math.pow((index - center) / stdDev, 2));
    });

    // Normalize bell curve values to sum to availableWeight
    const bellSum = bellValues.reduce((acc, val) => acc + val, 0);
    const normalizedBellValues = bellValues.map(val =>
      Math.round((val / bellSum) * availableWeight)
    );

    // Distribute any remainder due to rounding
    let distributedSum = normalizedBellValues.reduce((acc, val) => acc + val, 0);
    let remainder = availableWeight - distributedSum;

    // Distribute remainder evenly
    let index = 0;
    while (remainder !== 0) {
      normalizedBellValues[index % normalizedBellValues.length] += (remainder > 0 ? 1 : -1);
      remainder += (remainder > 0 ? -1 : 1);
      index++;
    }

    // Merge back with locked items
    let unlockedIndex = 0;
    const newItems = items.map(item => {
      if (item.locked) return item;
      const newWeight = normalizedBellValues[unlockedIndex++];
      return { ...item, weight: newWeight };
    });

    setItems(newItems);
  };

  // Apply exponential distribution (decreasing exponentially)
  const applyExponential = () => {
    const unlocked = items.filter(item => !item.locked);
    const locked = items.filter(item => item.locked);
    const lockedWeight = locked.reduce((acc, item) => acc + item.weight, 0);

    if (unlocked.length === 0) return; // All items are locked

    const availableWeight = 100 - lockedWeight;

    // Calculate exponential values (base around 0.5-0.7 works well for distribution)
    const base = Math.pow(0.1, 1 / (unlocked.length - 1 || 1));
    const expValues = unlocked.map((_, index) => Math.pow(base, index));

    // Normalize to sum to availableWeight
    const expSum = expValues.reduce((acc, val) => acc + val, 0);
    const normalizedExpValues = expValues.map(val =>
      Math.round((val / expSum) * availableWeight)
    );

    // Distribute any remainder due to rounding
    let distributedSum = normalizedExpValues.reduce((acc, val) => acc + val, 0);
    let remainder = availableWeight - distributedSum;

    // Distribute remainder evenly
    let index = 0;
    while (remainder !== 0) {
      normalizedExpValues[index % normalizedExpValues.length] += (remainder > 0 ? 1 : -1);
      remainder += (remainder > 0 ? -1 : 1);
      index++;
    }

    // Merge back with locked items
    let unlockedIndex = 0;
    const newItems = items.map(item => {
      if (item.locked) return item;
      const newWeight = normalizedExpValues[unlockedIndex++];
      return { ...item, weight: newWeight };
    });

    setItems(newItems);
  };

  // Apply random distribution
  const applyRandom = () => {
    const unlocked = items.filter(item => !item.locked);
    const locked = items.filter(item => item.locked);
    const lockedWeight = locked.reduce((acc, item) => acc + item.weight, 0);

    if (unlocked.length === 0) return; // All items are locked

    const availableWeight = 100 - lockedWeight;

    // Generate random values
    const randomValues = unlocked.map(() => Math.random());

    // Normalize to sum to availableWeight
    const randomSum = randomValues.reduce((acc, val) => acc + val, 0);
    const normalizedRandomValues = randomValues.map(val =>
      Math.round((val / randomSum) * availableWeight)
    );

    // Distribute any remainder due to rounding
    let distributedSum = normalizedRandomValues.reduce((acc, val) => acc + val, 0);
    let remainder = availableWeight - distributedSum;

    // Distribute remainder evenly
    let index = 0;
    while (remainder !== 0) {
      normalizedRandomValues[index % normalizedRandomValues.length] += (remainder > 0 ? 1 : -1);
      remainder += (remainder > 0 ? -1 : 1);
      index++;
    }

    // Merge back with locked items
    let unlockedIndex = 0;
    const newItems = items.map(item => {
      if (item.locked) return item;
      const newWeight = normalizedRandomValues[unlockedIndex++];
      return { ...item, weight: newWeight };
    });

    setItems(newItems);
  };

  // Toggle lock status for an item
  const toggleLock = (id) => {
    const newItems = items.map(item =>
      item.id === id ? { ...item, locked: !item.locked } : item
    );
    updateWeights(newItems);
  };

  // Update weights after drag
  const updateWeights = (newItems) => {
    const normalizedItems = normalizeWeights(newItems);
    setItems(normalizedItems);
  };

  // Start dragging a handle
  const startDrag = (index, e) => {
    e.preventDefault();
    // Don't allow dragging locked items
    if (items[index].locked) return;

    setActivePointIndex(index);
    setIsDragging(true);
  };

  // Handle mouse move during drag
  const handleMouseMove = (e) => {
    if (!isDragging || activePointIndex === null || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const height = rect.height;

    // Calculate weight based on vertical position (inverted)
    const relativeY = e.clientY - rect.top;
    let percentage = Math.max(0, Math.min(100, 100 - Math.round((relativeY / height) * 100)));

    // Create new items array with the dragged item's new weight
    const newItems = [...items];
    newItems[activePointIndex].weight = percentage;

    // Let the normalize function handle redistributing weight among other unlocked items
    updateWeights(newItems);
  };

  // End dragging
  const endDrag = () => {
    setIsDragging(false);
    setActivePointIndex(null);
  };

  // Drag and drop handlers for reordering table rows
  const handleDragStart = (id) => {
    setDraggedItemId(id);
  };

  const handleDragOver = (e, id) => {
    e.preventDefault();
    setDragOverItemId(id);
  };

  const handleDrop = (e) => {
    e.preventDefault();

    if (draggedItemId === null || dragOverItemId === null || draggedItemId === dragOverItemId) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }

    // Create a copy of items to reorder
    const itemsCopy = [...items];

    // Find indices of the dragged and target items
    const draggedIndex = itemsCopy.findIndex(item => item.id === draggedItemId);
    const dropIndex = itemsCopy.findIndex(item => item.id === dragOverItemId);

    if (draggedIndex === -1 || dropIndex === -1) return;

    // Remove dragged item from array
    const [draggedItem] = itemsCopy.splice(draggedIndex, 1);

    // Insert at new position
    itemsCopy.splice(dropIndex, 0, draggedItem);

    // Update state
    setItems(itemsCopy);
    setDraggedItemId(null);
    setDragOverItemId(null);
  };

  // Add global event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', endDrag);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', endDrag);
    };
  }, [isDragging, activePointIndex]);

  // Calculate the total graph width
  const graphWidth = 650;
  const graphHeight = 400;
  const paddingX = 40;
  const paddingY = 30;
  const contentWidth = graphWidth - (paddingX * 2);
  const contentHeight = graphHeight - (paddingY * 2);

  // Calculate positions for each point
  const points = items.map((item, index) => {
    const x = paddingX + (index * (contentWidth / (items.length - 1 || 1)));
    const y = graphHeight - paddingY - (item.weight / 100 * contentHeight);
    return { x, y, item };
  });

  // Generate curved path for the line using bezier curves
  const generateCurvedPath = (points) => {
    if (points.length < 2) return '';

    let path = `M ${points[0].x},${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];

      // Calculate control points for the curve
      const controlX1 = current.x + (next.x - current.x) / 3;
      const controlY1 = current.y;
      const controlX2 = current.x + 2 * (next.x - current.x) / 3;
      const controlY2 = next.y;

      // Add cubic bezier curve
      path += ` C ${controlX1},${controlY1} ${controlX2},${controlY2} ${next.x},${next.y}`;
    }

    return path;
  };

  const curvedPath = generateCurvedPath(points);

  // Add a new creative
  const addNewCreative = () => {
    const newId = items.length > 0 ? Math.max(...items.map(item => item.id)) + 1 : 1;
    const newItems = [...items, { id: newId, name: `Creative ${newId}`, weight: 0, locked: false }];
    setItems(normalizeWeights(newItems));
  };

  // Remove a creative
  const removeCreative = (id) => {
    if (items.length <= 1) return;
    const newItems = items.filter(item => item.id !== id);
    setItems(normalizeWeights(newItems));
  };

  // Update name
  const updateName = (id, newName) => {
    const newItems = items.map(item =>
      item.id === id ? { ...item, name: newName } : item
    );
    setItems(newItems);
  };

  // Update a weight directly in the table
  const updateTableWeight = (id, value) => {
    const newValue = parseInt(value, 10);
    if (isNaN(newValue)) return;

    // Limit input to 0-100 range
    const limitedValue = Math.max(0, Math.min(100, newValue));

    // Create new items array with the updated weight
    const newItems = items.map(item =>
      item.id === id ? { ...item, weight: limitedValue } : item
    );

    // Let the normalize function handle redistributing weight among other unlocked items
    updateWeights(newItems);
  };

  // Lock icon SVG path
  const LockIcon = ({ locked, size = 16 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {locked ? (
        // Locked icon (closed hasp)
        <>
          <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11" stroke="currentColor" strokeWidth="2" />
        </>
      ) : (
        // Unlocked icon (open hasp)
        <>
          <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7" stroke="currentColor" strokeWidth="2" />
        </>
      )}
    </svg>
  );

  // Drag handle icon
  const DragHandleIcon = ({ size = 16 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="cursor-grab text-gray-500 hover:text-gray-300"
    >
      <circle cx="9" cy="6" r="2" fill="currentColor" />
      <circle cx="9" cy="12" r="2" fill="currentColor" />
      <circle cx="9" cy="18" r="2" fill="currentColor" />
      <circle cx="15" cy="6" r="2" fill="currentColor" />
      <circle cx="15" cy="12" r="2" fill="currentColor" />
      <circle cx="15" cy="18" r="2" fill="currentColor" />
    </svg>
  );

  // Quick distribution button
  const DistributionButton = ({ onClick, disabled, title, children }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded text-sm ${disabled
          ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
          : 'bg-gray-800 text-white hover:bg-gray-700'
        }`}
      title={disabled ? "Unlock all items to use this distribution" : title}
    >
      {children}
    </button>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto bg-black text-gray-200" style={{ userSelect: 'none' }}>
      <h1 className="text-2xl font-bold text-white mb-6">Creatives</h1>

      <div className="mb-8 p-4 bg-gray-900 rounded-lg border border-gray-800 shadow" ref={containerRef}>
        <div className="flex justify-between items-center mb-4">
          {/* Fixed-height status area to prevent layout shifts */}
          <div className="h-6">
            {hasSignificantDeviation && (
              <p className="text-sm text-pink-500">
                Total must equal 100% (currently: {total}%)
              </p>
            )}
          </div>
          <div className="flex items-center text-sm">
            <span className="flex items-center mr-4">
              <span className="inline-block w-3 h-3 bg-pink-600 rounded-full mr-2"></span>
              Unlocked (adjustable)
            </span>
            <span className="flex items-center">
              <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
              Locked (fixed)
            </span>
          </div>
        </div>

        {/* Quick distribution buttons */}
        <div className="flex space-x-3 mb-4">
          <DistributionButton
            onClick={applyEvenDistribution}
            title="Distribute weights evenly among unlocked creatives"
          >
            Evenly
          </DistributionButton>

          <DistributionButton
            onClick={applyRandom}
            title="Distribute weights randomly"
          >
            Random
          </DistributionButton>

          <DistributionButton
            onClick={applyBellCurve}
            title="Distribute weights in a bell curve (normal distribution)"
            disabled={hasLockedItems}
          >
            Bell Curve
          </DistributionButton>

          <DistributionButton
            onClick={applyExponential}
            title="Distribute weights exponentially (decreasing)"
            disabled={hasLockedItems}
          >
            Exponential
          </DistributionButton>
        </div>

        {/* Custom SVG chart */}
        <div className="relative" style={{ cursor: isDragging ? 'grabbing' : 'default' }}>
          <svg width={graphWidth} height={graphHeight}>
            {/* Background grid */}
            {[...Array(11)].map((_, i) => (
              <line
                key={`grid-h-${i}`}
                x1={paddingX}
                y1={paddingY + (i * contentHeight / 10)}
                x2={graphWidth - paddingX}
                y2={paddingY + (i * contentHeight / 10)}
                stroke="#333333"
                strokeDasharray="4 4"
              />
            ))}

            {items.length > 1 && [...Array(items.length)].map((_, i) => (
              <line
                key={`grid-v-${i}`}
                x1={paddingX + (i * contentWidth / (items.length - 1))}
                y1={paddingY}
                x2={paddingX + (i * contentWidth / (items.length - 1))}
                y2={graphHeight - paddingY}
                stroke="#333333"
                strokeDasharray="4 4"
              />
            ))}

            {/* Reference line for equal distribution */}
            <line
              x1={paddingX}
              y1={graphHeight - paddingY - (contentHeight * (100 / items.length) / 100)}
              x2={graphWidth - paddingX}
              y2={graphHeight - paddingY - (contentHeight * (100 / items.length) / 100)}
              stroke="#666666"
              strokeDasharray="6 4"
            />
            <text
              x={graphWidth - paddingX + 5}
              y={graphHeight - paddingY - (contentHeight * (100 / items.length) / 100) + 4}
              fill="#888888"
              fontSize="12"
            >
              Equal ({Math.round(100 / items.length)}%)
            </text>

            {/* Y-axis labels */}
            {[0, 25, 50, 75, 100].map(value => (
              <React.Fragment key={`y-label-${value}`}>
                <text
                  x={paddingX - 5}
                  y={graphHeight - paddingY - (contentHeight * value / 100) + 4}
                  textAnchor="end"
                  fill="#888888"
                  fontSize="12"
                >
                  {value}%
                </text>
                <line
                  x1={paddingX - 2}
                  y1={graphHeight - paddingY - (contentHeight * value / 100)}
                  x2={paddingX}
                  y2={graphHeight - paddingY - (contentHeight * value / 100)}
                  stroke="#666666"
                />
              </React.Fragment>
            ))}

            {/* X-axis labels */}
            {points.map((point, index) => (
              <text
                key={`x-label-${index}`}
                x={point.x}
                y={graphHeight - paddingY + 20}
                textAnchor="middle"
                fill="#888888"
                fontSize="12"
              >
                {point.item.name}
              </text>
            ))}

            {/* Curved line connecting points */}
            <path
              d={curvedPath}
              fill="none"
              stroke="#ff007f"
              strokeWidth="3"
            />

            {/* Interactive drag handles */}
            {points.map((point, index) => (
              <g key={`handle-${index}`}>
                {/* Point with hover effect */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={8}
                  fill={point.item.locked ? '#f59e0b' : (activePointIndex === index ? '#ff007f' : '#ff007f')}
                  stroke="#ffffff"
                  strokeWidth="2"
                  style={{ cursor: point.item.locked ? 'not-allowed' : 'grab' }}
                  onMouseDown={(e) => startDrag(index, e)}
                />

                {/* Lock indicator for locked points - properly centered */}
                {point.item.locked && (
                  <g transform={`translate(${point.x - 4}, ${point.y - 4}) scale(0.4)`}>
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="white" strokeWidth="2.5" fill="none" />
                    <path d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11" stroke="white" strokeWidth="2.5" fill="none" />
                  </g>
                )}

                {/* Tooltip showing weight */}
                <g transform={`translate(${point.x + 15}, ${point.y - 15})`}>
                  <rect
                    x="-20"
                    y="-20"
                    width="40"
                    height="25"
                    rx="4"
                    fill="#222222"
                    stroke="#444444"
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#ffffff"
                    fontSize="12"
                  >
                    {point.item.weight}%
                  </text>
                </g>

                {/* Vertical guide line */}
                <line
                  x1={point.x}
                  y1={point.y}
                  x2={point.x}
                  y2={graphHeight - paddingY}
                  stroke={point.item.locked ? '#f59e0b' : '#ff007f'}
                  strokeDasharray="3 3"
                  strokeOpacity="0.6"
                />
              </g>
            ))}
          </svg>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-medium text-white mb-4">Distribution Table</h2>
        <div className="overflow-hidden rounded-lg border border-gray-800">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-gray-900">
              <tr>
                <th className="w-8 px-2 py-3"></th> {/* Drag handle column */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Weighting</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Lock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-black divide-y divide-gray-800">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={`${item.locked ? 'bg-yellow-900 bg-opacity-20' : ''} ${dragOverItemId === item.id ? 'border-t-2 border-pink-500' : ''}`}
                  draggable
                  onDragStart={() => handleDragStart(item.id)}
                  onDragOver={(e) => handleDragOver(e, item.id)}
                  onDrop={handleDrop}
                  onDragEnd={() => setDraggedItemId(null)}
                >
                  <td className="px-2 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-center">
                      <DragHandleIcon />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateName(item.id, e.target.value)}
                      className="bg-gray-900 border border-gray-700 rounded px-2 py-1 w-full max-w-xs text-white"
                      style={{ userSelect: 'text' }}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-full bg-gray-800 rounded-full h-2.5 mr-3">
                        <div
                          className={`h-2.5 rounded-full ${item.locked ? 'bg-yellow-500' : 'bg-pink-600'}`}
                          style={{ width: `${item.weight}%` }}
                        ></div>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.weight}
                        onChange={(e) => updateTableWeight(item.id, e.target.value)}
                        className="bg-gray-900 border border-gray-700 rounded px-2 py-1 w-16 text-right text-white"
                        disabled={item.locked}
                        style={{ userSelect: 'text' }}
                      />
                      <span className="ml-1 text-pink-500">%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => toggleLock(item.id)}
                      className={`p-2 rounded-full hover:bg-gray-800 ${item.locked ? 'text-yellow-500' : 'text-gray-500'}`}
                      title={item.locked ? "Unlock" : "Lock"}
                    >
                      <LockIcon locked={item.locked} />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => removeCreative(item.id)}
                      className="text-pink-600 hover:text-pink-400 ml-2"
                      disabled={items.length <= 1}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <button
          onClick={addNewCreative}
          className="px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700"
        >
          ADD CREATIVE
        </button>
      </div>
    </div>
  );
};

export default WeightDistributionEditor;
