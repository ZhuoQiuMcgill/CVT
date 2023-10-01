// Initialize an array to store the points for featureB
let canvas_points = [];
let isCalculating = false;
let doneCalculation = false;
let zoomLevel = 1;
let offsetX = 0;
let offsetY = 0;
let pointRadius = 4; // 点半径
let isBrushMode = false; // 刷子模式标志
let brushRadius = 40; // 刷子的半径
let brushDensity = 10; // 刷子密度
let firstSelectedPoint = null;
let secondSelectedPoint = null;
let importedJSONData = null; // 用于存储导入的 JSON 数据
let maxFrame = 10; // 最大帧数
let currentFrame = 0; // 当前帧数
let currentFrameData = null; // 当前帧数据集
let clusterColorMap = {}; // 动态生成的cluster与颜色的映射
let selectedPoint = null; // 用于跟踪当前选中的点
let selectedCluster = null; // 用于跟踪当前选中的cluster

// Get the canvas and context for featureB
const main_canvas = document.getElementById('main_canvas');
const ctx = main_canvas.getContext('2d');


/** 画布功能 */
function applyCanvasTransformations() {
    // 保存当前的绘图状态
    ctx.save();

    // 应用平移和缩放
    ctx.translate(main_canvas.width / 2, main_canvas.height / 2);
    ctx.scale(zoomLevel, zoomLevel);
    ctx.translate(-main_canvas.width / 2, -main_canvas.height / 2);
    ctx.translate(offsetX, offsetY);
}

function restoreCanvasTransformations() {
    // 恢复之前保存的绘图状态
    ctx.restore();
}

function redrawAll() {
    clearCanvas();
    applyCanvasTransformations();

    canvas_points.forEach(point => drawPoint(point.x, point.y));

    if (firstSelectedPoint) {
        drawSelectedPoint(firstSelectedPoint.x, firstSelectedPoint.y);
    }

    if (secondSelectedPoint) {
        drawSelectedPoint(secondSelectedPoint.x, secondSelectedPoint.y);
    }

    if (firstSelectedPoint && secondSelectedPoint) {
        const radius = Math.sqrt(Math.pow(secondSelectedPoint.x - firstSelectedPoint.x, 2) + Math.pow(secondSelectedPoint.y - firstSelectedPoint.y, 2));
        drawSelectedPoint(firstSelectedPoint.x, firstSelectedPoint.y, radius);
    }

    restoreCanvasTransformations();
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

    return {x: finalX, y: finalY};
}


function drawPoint(x, y, color = 'black', radius = pointRadius) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
}

function drawSelectedPoint(x, y, color = 'red', radius = pointRadius * 2) {
    ctx.strokeStyle = color;
    ctx.lineWidth = pointRadius / 4;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
}


// Function to clear the featureB canvas
function clearCanvas() {
    ctx.clearRect(0, 0, main_canvas.width, main_canvas.height);
}

function isClicked(point1, point2, radius = pointRadius * 2) {
    const distance = Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
    return distance <= radius;
}

function isClickedPos(x, y, click_point, radius = pointRadius * 2) {
    const distance = Math.sqrt(Math.pow(x - click_point.x, 2) + Math.pow(y - click_point.y, 2));
    return distance <= radius;
}

function updateTotalPoints() {
    document.getElementById('pointInfo').innerHTML = 'Total points: ' + canvas_points.length;
}

// 更新已选择的点的信息
function updateSelectedPoint() {
    if (selectedPoint) {
        selectedPoint = currentFrameData.global_env.points.find(point => isClickedPos(point.x, point.y, selectedPoint, pointRadius));
    }
}


let isMouseDown = false;  // 用于跟踪鼠标是否被按下
let currentMousePos = {x: 0, y: 0};  // 用于存储当前鼠标位置
// 当鼠标按下时
main_canvas.addEventListener('mousedown', function (event) {
    const {x, y} = convertMouseToCanvasCoords(event, main_canvas, offsetX, offsetY, zoomLevel);
    const clickedPoint = {x, y};
    isMouseDown = true;

    if (doneCalculation) {
        let json_points = currentFrameData.global_env.points;
        const existingPoint = json_points.find(point => isClickedPos(point.x, point.y, clickedPoint));

        if (existingPoint) {
            selectedPoint = existingPoint;
            document.getElementById('pointInfo').innerHTML = existingPoint.info
            if (event.shiftKey) {
                selectedCluster = existingPoint.label;
            }
            renderAll();
        } else {
            selectedCluster = null;
            selectedPoint = null;
            renderAll();
        }
    } else {
        const existingPoint = canvas_points.find(point => isClicked(point, clickedPoint));

        if (existingPoint) {
            if (isCalculating) {
                document.getElementById('pointInfo').innerHTML =
                    `Total points: ${canvas_points.length}<br> Point coordinates:<br> x = ${existingPoint.x.toFixed(2)}<br> y = ${existingPoint.y.toFixed(2)}`;

                if (event.shiftKey) {
                    if (firstSelectedPoint) {
                        secondSelectedPoint = existingPoint;
                    } else {
                        firstSelectedPoint = existingPoint;
                    }
                } else {
                    firstSelectedPoint = existingPoint;
                    secondSelectedPoint = null;
                }
            }
        } else {
            if (!isCalculating) {
                if (event.button === 0) {
                    canvas_points.push({x, y});
                } else if (event.button === 2) {
                    canvas_points.pop();
                }
                updateTotalPoints();
            }
            selectedPoint = null;
            firstSelectedPoint = null;
            secondSelectedPoint = null;
            updateTotalPoints();
        }

        redrawAll();
    }


});


// 当鼠标移动时
main_canvas.addEventListener('mousemove', function (event) {
    const {x, y} = convertMouseToCanvasCoords(event, main_canvas, offsetX, offsetY, zoomLevel);
    currentMousePos.x = x;
    currentMousePos.y = y;

    if (isMouseDown && isBrushMode && !isCalculating && !doneCalculation) {
        addBrushPoints(x, y);
        updateTotalPoints();
        redrawAll();
    }
});

// 当鼠标释放时
main_canvas.addEventListener('mouseup', function (event) {
    isMouseDown = false;  // 清除鼠标按下标志
});


/** 刷子功能 */
main_canvas.addEventListener('contextmenu', function (event) {
    event.preventDefault();
});

function addBrushPoints(centerX, centerY) {
    for (let i = 0; i < brushDensity; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.sqrt(Math.random()) * brushRadius;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        const newPoint = {x, y};

        // 检查新点是否与现有点太接近
        const isTooClose = canvas_points.some(point => isClicked(point, newPoint, pointRadius * 2));

        if (!isTooClose) {
            canvas_points.push(newPoint);
        }
    }
}

// 在刷子模式下，鼠标悬浮时绘制一个圆
main_canvas.addEventListener('mousemove', function (event) {
    if (isBrushMode && !isCalculating && !doneCalculation) {
        const rect = main_canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left - offsetX) / zoomLevel;
        const y = (event.clientY - rect.top - offsetY) / zoomLevel;
        redrawAll();  // 重新绘制所有点

        // 保存当前的绘图状态
        ctx.save();
        // 应用平移和缩放
        ctx.translate(offsetX, offsetY);
        ctx.scale(zoomLevel, zoomLevel);

        // 绘制悬浮显示的圆
        ctx.beginPath();
        ctx.arc(x, y, brushRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'black';
        ctx.stroke();

        // 恢复之前保存的绘图状态
        ctx.restore();
    }
});


// 切换刷子模式
document.getElementById('brushToggle').addEventListener('click', function () {
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
main_canvas.addEventListener('wheel', function (event) {
    event.preventDefault();

    // 更新缩放级别
    if (event.deltaY < 0) {
        zoomLevel *= 1.1;
    } else {
        zoomLevel /= 1.1;
    }

    // 重新绘制所有内容
    if (doneCalculation) {
        renderAll();
    } else {
        redrawAll();
    }
});


/** 镜头移动功能 */
document.addEventListener('keydown', function (event) {
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
    if (doneCalculation) {
        renderAll();
    } else {
        redrawAll();
    }
});


/** calculate 按钮功能 */
// Add event listener for the Calculate button
document.getElementById('calculate').addEventListener('click', function () {
    if (canvas_points.length === 0) {
        return;
    }
    isCalculating = true;
    redrawAll();
    // Send the points to the backend
    fetch('https://your-backend-api.com/savePoints', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({points: canvas_points})
    }).then(response => response.json())
        .then(data => {
            console.log('Success:', data);
        })
        .catch((error) => {
            console.error('Error:', error);
        });
});


/** clear 按钮功能 */
document.getElementById('clear').addEventListener('click', function () {
    isCalculating = false;      // 重置 isCalculating 变量
    canvas_points = [];         // 清空点数组
    selectedCluster = null;
    selectedPoint = null;       // 清空选中的点
    firstSelectedPoint = null;
    secondSelectedPoint = null;
    zoomLevel = 1;              // 重置 zoomLevel 为 1（无缩放）
    redrawAll();                // 重新绘制画布
    updateTotalPoints();        // 重设点总数
    importedJSONData = null;    // 清空json
    currentFrameData = null;    // 清空数据缓存
    pointRadius = 4;

});


/** goto 按钮功能 */
// Add event listener to the gotoPageB input to enforce the min and max values
document.getElementById('gotoPage').addEventListener('input', function () {
    const input = document.getElementById('gotoPage');
    if (parseInt(input.value) < 0) {
        input.value = 0;
    } else if (parseInt(input.value) > maxFrame) {
        input.value = maxFrame;
    }
});

document.getElementById('goto').addEventListener('click', function () {
    const input = document.getElementById('gotoPage');
    currentFrame = parseInt(input.value);
    currentFrameData = importedJSONData.frame_data.find(frame => frame.id === currentFrame);
    document.getElementById('gotoPage').value = currentFrame;
    updateSelectedPoint()
    renderAll();
});

document.getElementById("show").addEventListener('click', function () {
    document.getElementById('gotoPage').value = currentFrame;
    currentFrameData = importedJSONData.frame_data.find(frame => frame.id === currentFrame);
    updateSelectedPoint()
    renderAll();
})

document.getElementById("prev").addEventListener('click', function () {
    currentFrame -= 1;
    if (currentFrame < 0) {
        currentFrame = 0;
    }
    document.getElementById('gotoPage').value = currentFrame;
    currentFrameData = importedJSONData.frame_data.find(frame => frame.id === currentFrame);
    updateSelectedPoint()
    renderAll();
})

document.getElementById("next").addEventListener('click', function () {
    currentFrame += 1;
    if (currentFrame > maxFrame) {
        currentFrame = maxFrame;
    }
    document.getElementById('gotoPage').value = currentFrame;
    currentFrameData = importedJSONData.frame_data.find(frame => frame.id === currentFrame);
    updateSelectedPoint()
    renderAll();
})


/** 导入json文件 */
document.getElementById('jsonFileInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                importedJSONData = JSON.parse(e.target.result);
                console.log("JSON data imported successfully:", importedJSONData);
                // 初始化 clusterColorMap
                initializeClusterColorMap();
            } catch (error) {
                console.error("Error parsing JSON:", error);
            }
        };
        reader.readAsText(file);
    }
});

// 在导入JSON数据后调用此函数以初始化clusterColorMap
function initializeClusterColorMap() {
    clusterColorMap = {};
    maxFrame = importedJSONData.frame_data.length - 1;  // 设置 maxFrame 的值
    pointRadius = importedJSONData.point_radius;
    doneCalculation = true;
    currentFrame = 0;
    currentFrameData = importedJSONData.frame_data.find(frame => frame.id === 0);
    centerCanvasToMassCenter();
    importedJSONData.frame_data.forEach(frameData => {
        frameData.global_env.clusters.forEach(cluster => {
            const clusterId = cluster.id;
            if (!clusterColorMap[clusterId]) {
                clusterColorMap[clusterId] = generateRandomColor();
            }
        });
    });
}

// 计算镜头中心点
function centerCanvasToMassCenter() {
    let totalX = 0;
    let totalY = 0;
    let pointCount = 0;

    currentFrameData.global_env.points.forEach(point => {
        totalX += point.x;
        totalY += point.y;
        pointCount++;
    });

    if (pointCount === 0) {
        return; // 如果没有点，直接返回
    }

    // 计算质量中心
    const massCenterX = totalX / pointCount;
    const massCenterY = totalY / pointCount;

    // 更新偏移量以将质量中心设置为画布的中心
    offsetX = main_canvas.width / 2 - massCenterX;
    offsetY = main_canvas.height / 2 - massCenterY;
}


// 用来计算两个颜色之间的距离，用于判断颜色的接近程度
function colorDistance(color1, color2) {
    const r1 = parseInt(color1.substring(1, 3), 16);
    const g1 = parseInt(color1.substring(3, 5), 16);
    const b1 = parseInt(color1.substring(5, 7), 16);

    const r2 = parseInt(color2.substring(1, 3), 16);
    const g2 = parseInt(color2.substring(3, 5), 16);
    const b2 = parseInt(color2.substring(5, 7), 16);

    return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function generateRandomColor() {
    let color;
    let isUnique = false;
    let isDistinct = true;

    while (!isUnique || !isDistinct) {
        color = '#';
        for (let i = 0; i < 6; i++) {
            color += '0123456789ABCDEF'[Math.floor(Math.random() * 16)];
        }

        // 避免生成接近白色的颜色
        if (colorDistance(color, '#FFFFFF') < 100) {
            continue;
        }

        isUnique = !Object.values(clusterColorMap).includes(color);

        // 确保新颜色与已有颜色有足够的对比度
        isDistinct = Object.values(clusterColorMap).every(existingColor => colorDistance(color, existingColor) > 100);
    }

    return color;
}


function renderAll() {
    // 清空画布
    clearCanvas();
    applyCanvasTransformations();

    if (!currentFrameData) {
        console.error("No data for the current frame");
        return;
    }

    const pointsData = currentFrameData.global_env.points;
    const clustersData = currentFrameData.global_env.clusters;
    const proximity = currentFrameData.proximity;
    let info_text = '';

    // 渲染每一个点
    pointsData.forEach(point => {
        const x = point.x;
        const y = point.y;
        const color = clusterColorMap[point.label];
        if (point.label === proximity.merging_clusters.find(cluster=>cluster.id===0).cluster_id) {
            drawPoint(x, y, 'red', 1.5 * pointRadius);
        } else if (point.label === proximity.merging_clusters.find(cluster=>cluster.id===1).cluster_id) {
            drawPoint(x, y, 'blue', 1.5 * pointRadius);

        } else if (point.label === selectedCluster){
            drawPoint(x, y, color, pointRadius * 1.5);
        } else {
            drawPoint(x, y, color);
        }

    });
    console.log(info_text);

    let firstRefPoint = proximity.ref_points.find(point=>point.id===0);
    let secondRefPoint = proximity.ref_points.find(point=>point.id===1);
    drawSelectedPoint(firstRefPoint.x, firstRefPoint.y, '#00FF00');
    drawSelectedPoint(secondRefPoint.x, secondRefPoint.y, '#00FF00');
    info_text = proximity.info;
    document.getElementById("pointInfo").innerHTML = info_text;

    if (selectedPoint) {
        const x = selectedPoint.x;
        const y = selectedPoint.y;
        drawSelectedPoint(x, y);
        document.getElementById("pointInfo").innerHTML = info_text + selectedPoint.info;
    }

    // 恢复之前保存的绘图状态
    restoreCanvasTransformations();
}




