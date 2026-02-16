import * as THREE from 'three';

/**
 * 初始化现代感控件：双层发光球体
 * @param {THREE.Scene} scene - 场景对象
 * @returns {THREE.Group} - 返回 markerGroup 引用以便后续操作
 */
export function initMarker(scene) {
    const markerGroup = new THREE.Group();
    markerGroup.position.set(0, 0, 0); 
    markerGroup.name = "myClickableControl";
    const markerGroupColor = new THREE.Color("#ff6f00");

    // 1. 中心核心球体
    const core = new THREE.Mesh(
        new THREE.SphereGeometry(4, 32, 32),
        new THREE.MeshBasicMaterial({ color: markerGroupColor, transparent: true, opacity: 0.9 })
    );
    core.name = "marker_core";
    markerGroup.add(core);

    // 2. 扩散球壳逻辑
    const shellCount = 3;
    const shellGeo = new THREE.SphereGeometry(2, 32, 32); 

    for (let i = 0; i < shellCount; i++) {
        const shellMat = new THREE.MeshBasicMaterial({
            color: markerGroupColor,
            transparent: true,
            opacity: 0.5,
            side: THREE.BackSide 
        });
        const shell = new THREE.Mesh(shellGeo, shellMat);
        shell.name = `shell_wave_${i}`;
        // 存储偏移量用于动画计算
        shell.userData.offset = i / shellCount; 
        markerGroup.add(shell);
    }

    scene.add(markerGroup);
    return markerGroup;
}

/**
 * 特效球壳扩散动画更新
 * @param {THREE.Group} markerGroup - initMarker 返回的组对象
 * @param {number} time - 运行总时间 (通常传 Date.now() * 0.001 或 clock.getElapsedTime())
 */
export function updateMarker(markerGroup, time) {
    if (!markerGroup) return;

    // 1. 核心球体微弱呼吸效果
    const core = markerGroup.children.find(child => child.name === "marker_core");
    if (core) {
        core.scale.setScalar(1 + Math.sin(time * 4) * 0.1);
    }

    // 2. 扩散球壳逻辑
    markerGroup.children.forEach(child => {
        if (child.name.startsWith('shell_wave_')) {
            // 计算进度进度：0.0 -> 1.0 循环
            let progress = (time * 0.5 + child.userData.offset) % 1;
            
            // 尺寸从 1 倍扩散到 15 倍
            child.scale.setScalar(1 + progress * 15);
            // 透明度随扩散进度衰减
            child.material.opacity = (1 - progress) * 0.5;
            // 优化：太透明时隐藏，减少渲染压力
            child.visible = child.material.opacity > 0.01;
        }
    });
}