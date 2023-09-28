// Initialize an array to store the points for featureB
let points = [];
let isCalculating = false;
let zoomLevel = 1;
let offsetX = 0;
let offsetY = 0;
let isBrushMode = false;  // 刷子模式标志
let brushRadius = 40;  // 刷子的半径

// Get the canvas and context for featureB
const main_canvas = document.getElementById('main_canvas');
const ctxB = main_canvas.getContext('2d');



/** 画布功能 */
let pointRadius = 4;
let selectedPoint = null;  // 用于跟踪当前选中的点

function redrawAll() {
  clearCanvas();
  ctxB.save();  // 保存当前的绘图状态

  // 先移动到画布中心，然后进行缩放，最后再移动回去
  ctxB.translate(main_canvas.width / 2, main_canvas.height / 2);
  ctxB.scale(zoomLevel, zoomLevel);
  ctxB.translate(-main_canvas.width / 2, -main_canvas.height / 2);

  // 应用平移
  ctxB.translate(offsetX, offsetY);

  points.forEach(point => drawPoint(point.x, point.y));
  if (selectedPoint) {
    drawSelectedPoint(selectedPoint.x, selectedPoint.y);
  }
  ctxB.restore();  // 恢复之前保存的绘图状态
}

function convertMouseToCanvasCoords(event, canvasElement, offsetX, offsetY, zoomLevel) {
    const rect = canvasElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // 先移动到画布中心，然后进行缩放，最后再移动回去
    const scaledX = (x - canvasElement.width / 2) / zoomLevel + canvasElement.width / 2;
    const scaledY = (y - canvasElement.height / 2) / zoomLevel + canvasElement.height / 2;

    // 应用平移
    const finalX = scaledX - offsetX;
    const finalY = scaledY - offsetY;

    return { x: finalX, y: finalY };
}





function drawPoint(x, y) {
  ctxB.fillStyle = 'black';
  ctxB.beginPath();
  ctxB.arc(x, y, pointRadius, 0, Math.PI * 2);
  ctxB.fill();
}

function drawSelectedPoint(x, y, radius = pointRadius * 2) {
  ctxB.strokeStyle = 'blue';
  ctxB.lineWidth = 1;
  ctxB.beginPath();
  ctxB.arc(x, y, radius, 0, Math.PI * 2);
  ctxB.stroke();
}



// Function to clear the featureB canvas
function clearCanvas() {
  ctxB.clearRect(0, 0, main_canvas.width, main_canvas.height);
}

function isClicked(point1, point2, radius = pointRadius * 2) {
    const distance = Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
    return distance <= radius;
}

function updateTotalPoints() {
    document.getElementById('pointInfo').innerHTML = 'Total points: ' + points.length;
}



let isMouseDown = false;  // 用于跟踪鼠标是否被按下
let currentMousePos = { x: 0, y: 0 };  // 用于存储当前鼠标位置
// 当鼠标按下时
main_canvas.addEventListener('mousedown', function(event) {
    const { x, y } = convertMouseToCanvasCoords(event, main_canvas, offsetX, offsetY, zoomLevel);
    const clickedPoint = { x, y };
    isMouseDown = true;  // 设置鼠标按下标志

    // 检查该位置是否已有点
    const existingPoint = points.find(point => isClicked(point, clickedPoint));

    if (existingPoint) {
        if (isCalculating) {
            // Update the infoBoxB with the coordinates of the clicked point
            document.getElementById('pointInfo').innerHTML =
                `Total points: ${points.length}<br> Point coordinates:<br> x = ${existingPoint.x.toFixed(2)}<br> y = ${existingPoint.y.toFixed(2)}`;
            // Update the selected point
            selectedPoint = existingPoint;
        }
    } else {
        if (!isCalculating) {
            if (event.button === 0) {  // Left click
                points.push({ x, y });
            } else if (event.button === 2) {  // Right click
                points.pop();
            }
            updateTotalPoints();
        }
        // 如果点击的是空白区域，则取消选中的点
        selectedPoint = null;
    }

    // Redraw all points and the selected circle
    redrawAll();
});

// 当鼠标移动时
main_canvas.addEventListener('mousemove', function(event) {
    const { x, y } = convertMouseToCanvasCoords(event, main_canvas, offsetX, offsetY, zoomLevel);
    currentMousePos.x = x;
    currentMousePos.y = y;

    if (isMouseDown && isBrushMode && !isCalculating) {
        addBrushPoints(x, y);
        updateTotalPoints();
        redrawAll();
    }
});

// 当鼠标释放时
main_canvas.addEventListener('mouseup', function(event) {
    isMouseDown = false;  // 清除鼠标按下标志
});






/** 刷子功能 */
main_canvas.addEventListener('contextmenu', function(event) {
  event.preventDefault();
});

function addBrushPoints(centerX, centerY, numPoints = 10) {
    for (let i = 0; i < numPoints; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.sqrt(Math.random()) * brushRadius;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        const newPoint = { x, y };

        // 检查新点是否与现有点太接近
        const isTooClose = points.some(point => isClicked(point, newPoint, pointRadius * 2));

        if (!isTooClose) {
            points.push(newPoint);
        }
    }
}

// 在刷子模式下，鼠标悬浮时绘制一个圆
main_canvas.addEventListener('mousemove', function(event) {
    if (isBrushMode && !isCalculating) {
        const rect = main_canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left - offsetX) / zoomLevel;
        const y = (event.clientY - rect.top - offsetY) / zoomLevel;
        redrawAll();  // 重新绘制所有点

        // 保存当前的绘图状态
        ctxB.save();
        // 应用平移和缩放
        ctxB.translate(offsetX, offsetY);
        ctxB.scale(zoomLevel, zoomLevel);

        // 绘制悬浮显示的圆
        ctxB.beginPath();
        ctxB.arc(x, y, brushRadius, 0, Math.PI * 2);
        ctxB.strokeStyle = 'black';
        ctxB.stroke();

        // 恢复之前保存的绘图状态
        ctxB.restore();
    }
});


// 切换刷子模式
document.getElementById('brushToggle').addEventListener('click', function() {
    isBrushMode = !isBrushMode;
    console.log("current button state: " + isBrushMode);
    updateButtonColor();
    redrawAll();
});

function updateButtonColor() {
    const btnToggle = document.getElementById("brushToggle");
    btnToggle.style.backgroundColor = isBrushMode ? "green" : "red"; // 根据状态改变按钮颜色
}


/** 缩放功能 */
main_canvas.addEventListener('wheel', function(event) {
    event.preventDefault();

    // 更新缩放级别
    if (event.deltaY < 0) {
        zoomLevel *= 1.1;
    } else {
        zoomLevel /= 1.1;
    }

    // 重新绘制所有内容
    redrawAll();
});


/** 镜头移动功能 */
document.addEventListener('keydown', function(event) {
    const step = 20;  // 移动步长，您可以根据需要调整这个值

    switch (event.key.toLowerCase()) {
        case 'w':
            offsetY += step;
            break;
        case 'a':
            offsetX += step;
            break;
        case 's':
            offsetY -= step;
            break;
        case 'd':
            offsetX -= step;
            break;
        default:
            return;  // 如果按下的不是 WASD，不执行任何操作
    }

    redrawAll();  // 重新绘制画布以应用新的偏移量
});





/** calculate 按钮功能 */
// Add event listener for the Calculate button
document.getElementById('calculateB').addEventListener('click', function() {
    if (points.length === 0) {
        return;
    }
    isCalculating = true;
    redrawAll();
  // Send the points to the backend
  fetch('/api/send_clustering_points', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ points: points })
  }).then(response => response.json())
    .then(data => {
      console.log('Success:', data);
    })
    .catch((error) => {
      console.error('Error:', error);
    });
});





/** clear 按钮功能 */
document.getElementById('clearB').addEventListener('click', function() {
    isCalculating = false;  // 重置 isCalculating 变量
    points = [];  // 清空点数组
    selectedPoint = null;  // 清空选中的点
    zoomLevel = 1;  // 重置 zoomLevel 为 1（无缩放）
    redrawAll();  // 重新绘制画布
});





/** goto 按钮功能 */
// Placeholder for max_length, which will be received from the backend later
let maxLength = 10;  // Initialize to 0

// Function to update maxLength from the backend
async function updateMaxLength() {
    // Fetch the max_length from the backend
    // Replace the URL and key according to your actual API
    const response = await fetch('/api/get_max_length/');
    const data = await response.json();
    maxLength = data.max_length;

    // Update the max attribute of the input element
    document.getElementById('gotoPageB').max = maxLength;
}

// Add event listener to the gotoPageB input to enforce the min and max values
document.getElementById('gotoPageB').addEventListener('input', function() {
    const input = document.getElementById('gotoPageB');
    if (parseInt(input.value) < 0) {
        input.value = 0;
    } else if (parseInt(input.value) > maxLength) {
        input.value = maxLength;
    }
});


