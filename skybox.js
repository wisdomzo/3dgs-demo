import * as THREE from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

/**
 * 初始化天空遮罩球
 * @param {THREE.Scene} scene - 传入 main.js 中的场景对象
 */
export function initSkybox(scene) {
    // 1. 定义半径
    const sphereRadius = 900; 
    
    // 2. 创建球体几何体
    const sphereGeo = new THREE.SphereGeometry(sphereRadius, 64, 64);
    
    // 3. 定义材质
    const sphereMat = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color("#000000"), 
        side: THREE.BackSide 
    });
    
    const worldSphere = new THREE.Mesh(sphereGeo, sphereMat);
    
    // 4. 指定球体中心位置
    worldSphere.position.set(-120, 30, 0); 
    scene.add(worldSphere);

    // 5. 异步加载 EXR 贴图
    //new EXRLoader().load('./assets/sky/kloofendal_48d_partly_cloudy_puresky_1k.exr', function (texture) {
    new EXRLoader().load('https://pub-5b1001bb00a54146925791daab7472f5.r2.dev/sky/kloofendal_48d_partly_cloudy_puresky_1k.exr', function (texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping; 
        worldSphere.material.map = texture;
        worldSphere.material.color.set(new THREE.Color("#ffffff")); 
        worldSphere.material.needsUpdate = true;
        scene.environment = texture; 
    });

    return worldSphere; // 返回对象，方便后续可能的修改
}