import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LCCRender } from './sdk/lcc-0.5.5.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { initSkybox } from './skybox.js';
import { initMarker, updateMarker } from './marker.js';

// --- 1. 基础配置 ---
const scene = new THREE.Scene();
let isLoaded = false;
function getActiveCamera() {
    return isPersonView ? camera2 : camera1;
}
// --- 数字人配置 ---
let isPersonView = false;      // 视角切换开关
const playerHeight = 1.7;      // 数字人身高（相机高度）
const playerRadius = 0.5;      // 胶囊体半径
const clock = new THREE.Clock();
const personUI = document.getElementById('person-ui');
const btn1 = document.getElementById('btn-action-1');
const btn2 = document.getElementById('btn-action-2');
/**
 * 统一管理 UI 状态
 * @param {boolean} visible 是否显示第一人称 UI
 */
function togglePersonUI(visible) {
    if (personUI) {
        personUI.style.display = visible ? 'flex' : 'none';
    }
}




// --- 创建遮罩球 ---
initSkybox(scene);

// --- 创建可点击的 3D 控件 ---
const markerGroup = initMarker(scene);






// 获取 HTML 坐标元素的引用
const coordDiv = document.getElementById('coordinate-info');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1; // 如果天空太亮，可以调低此值（如 0.8）
document.body.appendChild(renderer.domElement);





// --- 高空俯瞰相机 (Camera 1) ---
const camera1 = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 150000);
camera1.position.set(300, 700, -150); // 放置在高空
// 允许自由旋转的控制器
const controls1 = new OrbitControls(camera1, renderer.domElement);
controls1.enabled = false;
// 限制缩放（距离场景中心的远近）
controls1.minDistance = 100;   // 相机最近能拉多近（防止穿进地里）
controls1.maxDistance = 800; // 相机最远能拉多远（必须小于盒子半径 5000）
controls1.minPolarAngle = 0;
controls1.maxPolarAngle = Math.PI / 4;
controls1.enablePan = false;
controls1.enableDamping = true; // 增加旋转的平滑感


// --- 数字人相机 (Camera 2) ---
const camera2 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
// 初始位置可以设为 marker 的位置
camera2.position.set(0, playerHeight, 0);
const camera2DefaultPos = camera2.position.clone();
const camera2DefaultQuat = camera2.quaternion.clone();
const camera2DefaultFov = camera2.fov;









// --- 4. 实现点击交互 (Raycaster) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
// 统一监听 pointerdown 事件
window.addEventListener('pointerdown', (event) => {
    // 拦截 1: 确保模型已加载
    if (!isLoaded) return;
    // 执行射线分发中心逻辑
    handleGlobalPointerDown(event);
}, { passive: false });

function handleGlobalPointerDown(event) {
    // 检查点击的目标是否是 Canvas（即 3D 场景）
    // 如果点击的是 HTML 按钮，直接返回，不执行射线检测
    if (event.target !== renderer.domElement) return;

    // 1. 坐标归一化 (NDC)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // 2. 更新相机矩阵并射击
    const activeCamera = getActiveCamera();
    activeCamera.updateMatrixWorld();
    raycaster.setFromCamera(mouse, activeCamera);

    // 3. 获取所有相交物体
    const intersects = raycaster.intersectObjects(scene.children, true);

    // 4. 逻辑分流
    if (intersects.length > 0) {
        // 只处理最前面的物体
        const hitObject = intersects[0].object;
        dispatchAction(hitObject, intersects[0].point);
    }
}

function dispatchAction(object, hitPoint) {
    // A. 身份识别：根据名称或父级名称判断
    const isControl = object.name === "myClickableControl" || object.parent.name === "myClickableControl";
    
    // B. 分流逻辑
    if (isControl) {
        // --- 逻辑 A: 执行老鹰俯冲 ---
        console.log("触发：老鹰俯冲");
        prepareCameraSwitch(); 
        startEagleDive(camera2, camera1, camera2);
    } else if (object.name === "Ground") {
        // --- 逻辑 B: 执行地面点击（可扩展） ---
        //console.log("触发：地面点击，坐标:", hitPoint);
        // 这里可以添加引导数字人移动的逻辑
    } else {
        // --- 逻辑 C: 默认反馈 ---
        //console.log("点击了无关物体:", object.name);
    }
}

function prepareCameraSwitch() {
    // 禁用控制器并同步相机位姿
    isPersonView = true;
    controls1.enabled = false;
    camera1.enabled = false;
    togglePersonUI(false);
    scene.remove(markerGroup);
}








btn1.addEventListener('pointerup', (event) => {
    // 阻止事件冒泡到 window 的 pointerdown 逻辑，防止触发场景点击
    event.stopPropagation(); 
    console.log("iPad/PC 通用触发：执行功能 1");
    // 执行具体逻辑，例如切回俯瞰视角
    // exitPersonView(); 
    startEagleDive(camera2, camera2, camera1);
});


btn2.addEventListener('pointerup', (event) => {
    event.stopPropagation(); 
    console.log("执行功能 2：例如开启自动巡检");
});







// --- 5. LCC 加载 (保持之前的配置) ---
const modelMatrix = new THREE.Matrix4(-1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1);
//const assetsBaseUrl = `${location.origin}/assets/digiCampus`;
//const assetsBaseUrl = "./assets/digiCampus";
const assetsBaseUrl = "https://pub-5b1001bb00a54146925791daab7472f5.r2.dev/digiCampus";
const lccObject = LCCRender.load({
    camera: camera1,
    scene: scene,
    dataPath: {
        meta: { url: `${assetsBaseUrl}/Digcampus.lcc` },
        collision: { url: `${assetsBaseUrl}/collision.lci` },
        index: { url: `${assetsBaseUrl}/index.bin` },
        data: { url: `${assetsBaseUrl}/data.bin` },
        environment: {url: `${assetsBaseUrl}/environment.bin`}
    },
    renderLib: THREE,
    canvas: renderer.domElement,
    renderer: renderer,
    modelMatrix: modelMatrix,
    appKey: 'xxxxxx',
}, (mesh) => {
    console.log('LCC 加载完成');
    isLoaded = true;
    controls1.enabled = true; // 允许用户开始旋转视角

    // 获取遮罩元素并执行隐藏或删除
    const loader = document.getElementById('loader');
    if (loader) {
        // 使用 CSS 渐隐效果更平滑
        loader.style.transition = 'opacity 0.5s ease';
        loader.style.opacity = '0';
        
        // 动画结束后从 DOM 中彻底移除，释放内存
        setTimeout(() => {
            loader.remove(); 
            console.log('加载遮罩已移除');
        }, 500);
    }
    if (lccObject && lccObject.hasCollision()) {
        console.log('✅ 碰撞功能已就绪 (Collision available)');
    } else {
        console.log('❌ 碰撞功能暂不可用，请检查路径或 SDK 版本');
    }

}, function (percent) {
    const bar = document.getElementById('loading-bar');
    const text = document.getElementById('progress-text');  
    if (bar) bar.style.width = (percent * 100) + '%';
    if (text) text.innerText = `资源加载中: ${(percent * 100).toFixed(0)}%`;
});
    







// 键盘状态记录
const keys = { w: false, a: false, s: false, d: false };
window.addEventListener('keydown', (e) => { if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false; });



//渲染
let lastUIUpdateTime = 0;
let lastAnimUpdateTime = 0;
function render() {
    const delta = clock.getDelta();
    const activeCamera = getActiveCamera();
    const time = Date.now() * 0.001;
    const now = performance.now();

    // 如果数据还没准备好，仅渲染基础场景，不执行复杂的点云计算
    if (!isLoaded) {
        LCCRender.update();
        return; 
    }

    // --- 1. 核心渲染 (高优先级) ---
    LCCRender.setCamera(activeCamera);
    if (!isPersonView) {
        controls1.update(); 
        updateMarker(markerGroup, time);
    } else {
        handlePersonMovement(delta);// 这里处理 WASD 和胶囊体碰撞
    }
    LCCRender.update();
    renderer.render(scene, activeCamera);

    // --- 2. UI 更新 (低优先级，每 100ms 更新一次) ---
    if (now - lastUIUpdateTime > 100) {
        if (coordDiv) {
            const p = activeCamera.position;
            coordDiv.innerHTML = `相机: ${isPersonView ? '数字人' : '俯瞰'}<br>X: ${p.x.toFixed(2)}<br>Y: ${p.y.toFixed(2)}<br>Z: ${p.z.toFixed(2)}`;
        }
        lastUIUpdateTime = now;
    }

}
renderer.setAnimationLoop(render);






// 窗口自适应
window.addEventListener('resize', () => {
    camera1.aspect = window.innerWidth / window.innerHeight;
    camera1.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
);









const _capsuleStart = { x: 0, y: 0, z: 0 };
const _capsuleEnd = { x: 0, y: 0, z: 0 };
const _moveDirection = new THREE.Vector3();
function handlePersonMovement(delta) {
    if (!isPersonView) return;

    const moveSpeed = 5 * delta;
    camera2.getWorldDirection(_moveDirection);
    _moveDirection.y = 0;
    _moveDirection.normalize();

    if (keys.w) camera2.position.addScaledVector(_moveDirection, moveSpeed);
    if (keys.s) camera2.position.addScaledVector(_moveDirection, -moveSpeed);

    if (lccObject && lccObject.hasCollision()) {
        // 直接修改属性而非创建新对象
        _capsuleStart.x = camera2.position.x;
        _capsuleStart.y = camera2.position.y - playerHeight;
        _capsuleStart.z = camera2.position.z;

        _capsuleEnd.x = camera2.position.x;
        _capsuleEnd.y = camera2.position.y;
        _capsuleEnd.z = camera2.position.z;
        
        const intersectResult = lccObject.intersectsCapsule({ 
            start: _capsuleStart, end: _capsuleEnd, radius: playerRadius, noDelta: false 
        });

        if (intersectResult.hit) {
            camera2.position.x += intersectResult.delta.x;
            camera2.position.y += intersectResult.delta.y;
            camera2.position.z += intersectResult.delta.z;
        }
    }
}




// 俯冲动画配置
// 临时变量，避免 GC 卡顿
const _tempPos = new THREE.Vector3();
const _tempTarget = new THREE.Vector3();
/**
 * 通用相机切换动画函数
 * @param {THREE.Camera} movingCam - 实际执行位移和渲染的相机 (通常是 camera2)
 * @param {THREE.Camera} startCam  - 动画起点参照
 * @param {THREE.Camera} endCam    - 动画终点参照
 */
function startEagleDive(movingCam, startCam, endCam) {

    const startPos = startCam.position.clone();
    const targetPoint = endCam.position.clone();
    const targetFov = endCam.fov;

    movingCam.position.copy(startCam.position);
    movingCam.quaternion.copy(startCam.quaternion);
    movingCam.fov = startCam.fov;
    movingCam.updateProjectionMatrix();

    // 最终位置和取景目标
    const endPos = targetPoint.clone();
    const isReturning = (endCam === camera1);

    // --- 轨迹分析 (参考 PlayCanvas 逻辑) ---
    const moveVec = new THREE.Vector3().subVectors(endPos, startPos);
    const horizontalDist = Math.sqrt(moveVec.x ** 2 + moveVec.z ** 2);
    const verticalDist = Math.abs(moveVec.y);
    const diveAngle = Math.atan2(verticalDist, horizontalDist) * (180 / Math.PI);
    
    // 自动选择轨迹类型
    let trajectoryType = 'bezier';
    if (diveAngle > 45 && horizontalDist > 300) trajectoryType = 'parabola';
    
    // 动态调整时长：距离越远，时间越长（1.5s - 3.5s）
    const duration = Math.max(1500, Math.min(3500, (horizontalDist + verticalDist) * 2));

    let startTime = performance.now();

    // 在函数开始处获取终点的旋转快照
    const endQuat = endCam.quaternion.clone();
    function animateDive() {
        const elapsed = performance.now() - startTime;
        const t = Math.min(elapsed / duration, 1.0);
        
        // 使用 Quadratic Out 缓动函数，让着陆更平滑
        const easeT = 1 - Math.pow(1 - t, 2);

        // --- 位置计算 ---
        if (trajectoryType === 'parabola') {
            // 放物线：增加一个弧度高度
            const height = verticalDist * 0.3;
            _tempPos.lerpVectors(startPos, endPos, easeT);
            _tempPos.y += Math.sin(easeT * Math.PI) * height;
        } else {
            // 贝塞尔曲线
            const control = new THREE.Vector3().lerpVectors(startPos, endPos, 0.5);
            control.y += 50; // 固定的控制点高度
            const u = 1 - easeT;
            _tempPos.set(
                u * u * startPos.x + 2 * u * easeT * control.x + easeT * easeT * endPos.x,
                u * u * startPos.y + 2 * u * easeT * control.y + easeT * easeT * endPos.y,
                u * u * startPos.z + 2 * u * easeT * control.z + easeT * easeT * endPos.z
            );
        }
        movingCam.position.copy(_tempPos);

        if (isReturning) {
            // 1. 先计算“盯着地面”的临时旋转
            movingCam.lookAt(startPos.x, startPos.y, startPos.z);
            const lookAtQuat = movingCam.quaternion.clone();
            // 2. 使用球面线性插值 (Slerp) 
            // 随着 easeT 接近 1.0，旋转会从“看地面”平滑转向“相机1的角度”
            movingCam.quaternion.slerpQuaternions(lookAtQuat, endQuat, easeT);
        } else {
            // --- 俯冲模式：原本的平滑过渡逻辑 ---
            const endTarget = new THREE.Vector3(targetPoint.x, targetPoint.y, targetPoint.z - 10);
            _tempTarget.lerpVectors(targetPoint, endTarget, easeT);
            movingCam.lookAt(_tempTarget);
        }

        // --- FOV 动态效果 (模拟速度感) ---
        // 在中间点(t=0.5)时 FOV 最大
        const fovEffect = Math.sin(easeT * Math.PI) * 15;
        movingCam.fov = targetFov + fovEffect;
        movingCam.updateProjectionMatrix();

        // --- SDK 预加载时机 ---
        // 参考 PlayCanvas 的 updateInterval 思想，在接近地面时切换渲染
        if (easeT > 0.7 && !movingCam.userData.isSDKSet) {
            LCCRender.setCamera(movingCam);
            movingCam.userData.isSDKSet = true;
        }

        if (t < 1.0) {
            requestAnimationFrame(animateDive);
        } else {
            movingCam.fov = targetFov;
            movingCam.updateProjectionMatrix();
            movingCam.userData.isSDKSet = false;
            if (endCam === camera1) {
                isPersonView = false;    // 这时候再切回俯瞰逻辑
                controls1.enabled = true; // 重新启用控制器
                camera1.enabled = true;
                scene.add(markerGroup);
                movingCam.position.copy(camera2DefaultPos);
                movingCam.quaternion.copy(camera2DefaultQuat);
                movingCam.fov = camera2DefaultFov;
            }
            // 动画结束后显示功能图标
            togglePersonUI(isPersonView);
            console.log(`[EagleDive] 到达目的地，轨迹类型: ${trajectoryType}`);
        }
    }
    requestAnimationFrame(animateDive);
}