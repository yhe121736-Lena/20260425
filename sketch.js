let stars = [];
let video;             // 攝影機輸入
let astronautImg;      // 預設頭像
let isVideoAvailable = false; // 攝影機是否可用
let faceMesh;          // ml5 臉部偵測模型
let faces = [];        // 儲存偵測到的臉部特徵
let spaceObjects = []; // 存放隕石、外星人、太空人
let lasers = [];       // 存放發射中的雷射
let particles = [];    // 存放擊中時產生的碎裂粒子
let shakeAmount = 0;   // 畫面抖動強度
let isWarping = false; // 控制背景模式：false 為星空漂移，true 為前進噴發
let isAutoPilot = false; // 自動導航開關
let isScanningMode = false; // 控制是否進入全螢幕模擬掃描模式
let isDetecting = false; // 新增：追蹤偵測是否已成功啟動
let autoDodgeX = 0;    // 自動導航產生的偏移量
let autoDodgeY = 0;
let cameraError = false; // 紀錄攝影機是否開啟失敗
let planets = [];      // 存放背景行星
let energyPulse = [];   // 能量波形數據儲存
let distanceTraveled = 0; // 紀錄星際行進總距離
let scanLinePos = 0;   // 獨立記錄掃描線位置，確保流暢
let typewriterTimeout; // 用來儲存打字機計時器，避免重疊執行
let missionScore = 0;  // 新增：紀錄任務積分
let logText = "<b>> 核心架構：</b>採用 <span style='color: #fff;'>vertex()</span> 陣列實現多維度空間透視。<br><b>> 導航系統：</b>整合 <span style='color: #fff;'>map()</span> 映射函數與物理撞擊反饋邏輯。<br><b>> 資料鏈結：</b>支援透過遠端通訊窗 (iframe) 檢索程式演進數據。系統目前運行正常，穿越隕石帶中...";
let projects = [
  { name: "幾何座標之戰", url: "https://yhe121736-lena.github.io/20260407-1/" },
  { name: "變數動力核心", url: "https://yhe121736-lena.github.io/20260414/" },
  { name: "迴圈奇點脈衝", url: "https://yhe121736-lena.github.io/20260421-1/" },
  { name: "生物特徵辨識", url: "week4/face_scan.html" },
  { name: "量子引力矩陣", url: "week4/quantum.html" },
  { name: "光子通訊解碼", url: "week4/photon.html" }
];

function preload() {
  // 預載預設的太空人頭像（可以使用本地路徑或網路圖片 URL）
  astronautImg = loadImage('https://img.icons8.com/color/160/000000/astronaut.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  noCursor(); // 隱藏原生游標，改用自定義 HUD
  
  // 背景星空初始化
  for (let i = 0; i < 200; i++) {
    stars.push(new Star());
  }

  // 初始化背景行星
  for (let i = 0; i < 3; i++) { // 3-5顆行星，避免畫面過於擁擠
    planets.push(new Planet());
  }

  // 初始化太空物件
  for (let i = 0; i < 3; i++) {
    spaceObjects.push(new SpaceObject());
  }

  // 初始化能量波形
  for (let i = 0; i < 40; i++) {
    energyPulse.push(0);
  }

  // 使用 p5.dom createElement 動態生成按鈕選單
  let menuLabel = createElement('h4', '任務導覽選單');
  menuLabel.position(30, 20);
  menuLabel.style('color', '#00f2ff');
  menuLabel.style('font-family', "'Orbitron', sans-serif");

  projects.forEach((proj, i) => {
    let btn = createButton(proj.name);
    btn.position(30, 60 + i * 40);
    btn.mousePressed(() => {
      if (proj.name === "生物特徵辨識") {
        isScanningMode = true;
        initBiometrics();
        // 修正：增加安全檢查，避免 HTML 元素不存在時程式崩潰
        let container = document.getElementById('gallery-container');
        if (container) container.style.display = 'none';
        let frame = document.getElementById('project-frame');
        if (frame) frame.src = "";
      } else {
        isScanningMode = false;
        loadProject(proj.url);
      }
    });
    btn.style('background', 'rgba(0, 242, 255, 0.2)');
    btn.style('color', '#fff');
    btn.style('font-family', "'Share Tech Mono', monospace");
    btn.style('border', '1px solid #00f2ff');
    btn.style('padding', '5px 15px');
    btn.style('cursor', 'pointer');
  });

  // 新增：模式切換按鈕
  let warpBtn = createButton('切換飛行模式');
  warpBtn.position(30, height - 60);
  warpBtn.mousePressed(() => { isWarping = !isWarping; });
  warpBtn.style('background', 'rgba(255, 0, 85, 0.3)');
  warpBtn.style('color', '#fff');
  warpBtn.style('font-family', "'Orbitron', sans-serif");
  warpBtn.style('border', '1px solid #ff0055');
  warpBtn.style('padding', '5px 15px');
  warpBtn.style('cursor', 'pointer');

  // 新增：自動導航開關按鈕
  let autoBtn = createButton('自動導航系統');
  autoBtn.position(160, height - 60);
  autoBtn.mousePressed(() => { isAutoPilot = !isAutoPilot; });
  autoBtn.style('background', 'rgba(0, 255, 150, 0.3)');
  autoBtn.style('color', '#fff');
  autoBtn.style('font-family', "'Orbitron', sans-serif");
  autoBtn.style('border', '1px solid #00ff96');
  autoBtn.style('padding', '5px 15px');
  autoBtn.style('cursor', 'pointer');

  // 啟動打字機效果：系統日誌輸出
  startTypewriter('log-content', logText, 30);

  // 新增：當滑鼠移入日誌區域時重頭播放
  select('#reflection-box').mouseOver(() => {
    startTypewriter('log-content', logText, 30);
  });

  // 初始化視窗拖動功能
  initDraggable();

  // 綁定關閉按鈕事件 (假設你的 HTML 中有關閉按鈕 id 為 close-btn)
  let closeBtn = select('#close-btn');
  if (closeBtn) {
    closeBtn.mousePressed(closeProject);
  }

  // 新增：監聽來自小遊戲 (iframe) 的通訊訊號
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'ADD_SCORE') {
      missionScore += event.data.amount;
    }
  });
}

function draw() {
  background(5, 5, 20); // 深邃太空色

  // 處理畫面抖動效果
  let currentShake = shakeAmount; 
  if (currentShake > 0) {
    push();
    translate(random(-currentShake, currentShake), random(-currentShake, currentShake));
  }

  // 1. 優化視差偏移 (Parallax) - 使用 lerp 讓移動更平滑
  let parallaxStrength = 25;
  let targetX = map(mouseX, 0, width, parallaxStrength, -parallaxStrength);
  let targetY = map(mouseY, 0, height, parallaxStrength, -parallaxStrength);

  if (isAutoPilot) {
    // 1. 尋找最危險的隕石 (距離近且靠近中心)
    let threat = null;
    let minDist = width;
    for (let obj of spaceObjects) {
      if (obj.type === 'asteroid' && obj.z < width * 0.6) {
        if (obj.z < minDist) {
          minDist = obj.z;
          threat = obj;
        }
      }
    }

    // 2. 如果有威脅，計算躲避向量
    if (threat) {
      // 向隕石的反方向偏移，z 越近偏移越強
      let dodgePower = map(threat.z, 0, width * 0.6, 120, 0);
      // 修正：如果隕石在右(x>0)，畫面向右移(moveX > 0)才能將隕石推離中心
      autoDodgeX = lerp(autoDodgeX, threat.x > 0 ? dodgePower : -dodgePower, 0.15);
      autoDodgeY = lerp(autoDodgeY, threat.y > 0 ? dodgePower : -dodgePower, 0.15);
    } else {
      autoDodgeX = lerp(autoDodgeX, 0, 0.05);
      autoDodgeY = lerp(autoDodgeY, 0, 0.05);
    }
  } else {
    autoDodgeX = lerp(autoDodgeX, 0, 0.1);
    autoDodgeY = lerp(autoDodgeY, 0, 0.1);
  }

  let moveX = targetX + autoDodgeX;
  let moveY = targetY + autoDodgeY;

  // 累積行進距離
  let speedMult = isWarping ? 50 : 2;
  distanceTraveled += speedMult;

  // 繪製背景星空
  for (let s of stars) {
    s.update();
    s.display(moveX, moveY);
  }

  // 繪製背景行星 (位於星星之後，太空物件之前)
  for (let p of planets) {
    p.update();
    p.display(moveX, moveY);
  }

  // 修正：將觀測窗反射移到背景之後、座艙之前繪製
  drawWindowReflection(moveX, moveY);

  // 繪製太空物件
  for (let obj of spaceObjects) {
    obj.update(moveX, moveY);
    obj.display(moveX, moveY);
  }

  // 新增：自動導航模式下的自動瞄準射擊
  if (isAutoPilot && frameCount % 15 === 0) { // 每 15 幀檢查一次，避免射擊過快
    let target = null;
    for (let obj of spaceObjects) {
      if (obj.type === 'asteroid' && obj.z < width * 0.5) target = obj;
    }
    if (target) {
      let tx = map(target.x / target.z, -1, 1, 0, width) + moveX * 1.5;
      let ty = map(target.y / target.z, -1, 1, 0, height) + moveY * 1.5;
      lasers.push({ x: tx, y: ty, life: 5 });
      missionScore += 100;
      target.reset();
      shakeAmount = 4; // 自動擊落的小震動
    }
  }

  // 繪製座艙主體
  drawSpaceCabin(moveX, moveY);
  
  // 裝飾性的掃描線 (現在獨立於 drawSpaceCabin 之外)
  noFill();
  for (let i = 0; i < height; i += 20) {
    stroke(0, 242, 255, 15);
    let scanY = (i + frameCount) % height;
    line(0, scanY, width, scanY);
  }
  // 新增：繪製頂部指南針
  drawCompass();

  // 新增：繪製流動星圖
  drawStarMap();

  // 新增：繪製側邊動態數據流
  drawSideDataStreams();

  // 繪製 HUD 與 儀表板數據
  drawShieldEffect();
  drawHUD(moveX, moveY);

  // 繪製雷射波
  drawLasers();

  // 新增：繪製與更新碎裂粒子
  drawParticles();

  // 新增：撞擊時的紅色警告邊框
  if (shakeAmount > 2) {
    noFill();
    stroke(255, 0, 0, map(shakeAmount, 0, 20, 0, 255)); // 透明度隨抖動強度變化
    strokeWeight(20);
    rectMode(CORNER);
    rect(0, 0, width, height);
  }

  if (currentShake > 0) {
    pop(); // 結束抖動位移
    shakeAmount *= 0.9; // 抖動逐漸減弱 (在 pop 之後才冷卻)
    if (shakeAmount < 0.1) shakeAmount = 0;
  }

  // 如果開啟了掃描模式，繪製全螢幕模擬掃描介面
  if (isScanningMode) {
    drawScanningInterface();
  }

  // 繪製自定義滑鼠游標，確保它在最上層
  drawMouseCursor();
}

// 新增：滑鼠點擊發射雷射
function mousePressed() {
  // 如果在掃描模式，點擊畫面任意處或特定按鈕可以結束掃描
  if (isScanningMode) {
    let scanH = min(height * 0.6, 480);
    let y = (height - scanH) / 2;
    let closeX = width / 2;
    let closeY = y - 80; // 修正：將點擊判定區域移至上方
    
    // 修正：僅在偵測到人臉（按鈕跳出後）且點擊按鈕區域時才關閉
    if (faces.length > 0 && dist(mouseX, mouseY, closeX, closeY) < 75) {
      isScanningMode = false;
      stopBiometrics();
      
      // 恢復：簡單的歡迎訊息與隨機編號
      let welcomeMsg = `> <span style='color: #00ff96;'>身分驗證成功</span>：歡迎使用者 <span style='color: #fff;'>CREW-${floor(random(1000, 9999))}</span>`;
      
      startTypewriter('log-content', welcomeMsg, 50, () => {
        // 歡迎訊息跑完後，延遲 2 秒再跑原有的任務日誌
        setTimeout(() => {
          startTypewriter('log-content', logText, 30);
        }, 2000);
      });
      return;
    }
  }

  if (mouseX < 250) return;

  // 加入新雷射 (壽命 5 幀)
  lasers.push({ x: mouseX, y: mouseY, life: 5 });

  // 檢查是否擊中太空物件
  for (let obj of spaceObjects) {
    if (obj.checkHit(mouseX, mouseY)) {
      // 根據物件類型決定碎片顏色 [R, G, B]
      let pCol;
      if (obj.type === 'asteroid') pCol = [100, 80, 70];
      else if (obj.type === 'comet') pCol = [255, 215, 0];
      else if (obj.type === 'alien') pCol = [0, 255, 100];
      else pCol = [255, 255, 255];

      // 產生 15 個碎裂粒子
      for (let i = 0; i < 15; i++) {
        particles.push(new Particle(mouseX, mouseY, pCol));
      }

      missionScore += (obj.type === 'comet' ? 500 : 100); // 擊中加分，彗星分數更高
      obj.reset();
      shakeAmount = 8; // 擊碎物件時的小震動
    }
  }
}

// 運用 vertex 繪製太空艙透視結構
function drawSpaceCabin(ox, oy) {
  push();
  let mainCol = shakeAmount > 5 ? color(255, 50, 50) : color(0, 242, 255);
  
  // 使用複合漸層模擬工業金屬質感
  let ctx = drawingContext;
  let wallGrad = ctx.createLinearGradient(0, 0, width * 0.2, height);
  wallGrad.addColorStop(0, '#0a0a0f');
  wallGrad.addColorStop(0.5, '#1a1a25');
  wallGrad.addColorStop(1, '#05050a');

  stroke(mainCol, 100);
  strokeWeight(2);

  // 1. 左側牆面 (實體化)
  ctx.fillStyle = wallGrad;
  beginShape();
  vertex(0, 0);
  vertex(width * 0.2 + ox, height * 0.2 + oy);
  vertex(width * 0.2 + ox, height * 0.8 + oy);
  vertex(0, height);
  endShape(CLOSE);

  // 2. 右側牆面 (實體化)
  beginShape();
  vertex(width, 0);
  vertex(width * 0.8 + ox, height * 0.2 + oy);
  vertex(width * 0.8 + ox, height * 0.8 + oy);
  vertex(width, height);
  endShape(CLOSE);

  // 3. 頂部與底部結構框架
  fill(10, 10, 20);
  rect(0, 0, width, height * 0.05);
  rect(0, height * 0.95, width, height * 0.05);

  // 3. 觀測窗細節優化
  noFill();
  strokeWeight(2);
  rectMode(CORNERS);
  rect(width * 0.2 + ox, height * 0.2 + oy, width * 0.8 + ox, height * 0.8 + oy);
  
  // 固定扣加入發光點
  fill(shakeAmount > 5 ? '#ff0055' : '#00f2ff');
  noStroke();
  rect(width * 0.2 + ox - 5, height * 0.2 + oy - 5, width * 0.2 + ox + 5, height * 0.2 + oy + 5);
  rect(width * 0.8 + ox - 5, height * 0.2 + oy - 5, width * 0.8 + ox + 5, height * 0.2 + oy + 5);

  // 修正：補上缺失的 pop() 避免矩陣堆疊溢出導致畫面消失
  pop();
}

// 新增：繪製觀測窗玻璃反射
function drawWindowReflection(ox, oy) {
  push();
  let ctx = drawingContext;
  let grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
  ctx.fillStyle = grad;
  noStroke();
  // 反射層隨移動產生微小視差，模擬玻璃厚度
  rect(width * 0.2 + ox * 0.8, height * 0.2 + oy * 0.8, width * 0.6, height * 0.6);
  pop();
}

// 新增：頂部指南針介面
function drawCompass() {
  push();
  let cx = width / 2;
  let cy = 40;
  stroke(0, 242, 255, 100);
  line(cx - 150, cy, cx + 150, cy); // 主橫線
  
  textAlign(CENTER);
  textSize(10);
  fill(0, 242, 255, 150);
  
  // 繪製動態刻度
  for (let i = -180; i <= 180; i += 30) {
    let xOffset = ((i + frameCount * 0.5) % 360);
    if (xOffset > 180) xOffset -= 360;
    if (xOffset < -180) xOffset += 360;
    
    let x = cx + xOffset * 0.8;
    if (x > cx - 150 && x < cx + 150) {
      line(x, cy, x, cy - 5);
      text(i === 0 ? "N" : i === 90 ? "E" : i === -90 ? "W" : abs(i) === 180 ? "S" : i, x, cy + 15);
    }
  }
  // 中心指示紅線
  stroke(255, 0, 85);
  line(cx, cy - 10, cx, cy + 5);
  pop();
}

// 新增：繪製頂部星際流動星圖
function drawStarMap() {
  push();
  let mapW = 400;
  let mapH = 20;
  let mapX = width / 2 - mapW / 2;
  let mapY = 85; // 位於指南針下方

  // 繪製地圖背景框
  fill(0, 40, 80, 50);
  stroke(0, 242, 255, 100);
  rect(mapX, mapY, mapW, mapH, 3);

  // 繪製流動的星系標記
  let spacing = 150;
  for (let i = 0; i < 10; i++) {
    // 根據 distanceTraveled 計算星系的 X 座標
    let worldX = i * spacing;
    let sx = ( (worldX - distanceTraveled * 0.1) % (mapW + spacing) + (mapW + spacing)) % (mapW + spacing) - spacing/2;
    
    let drawX = mapX + sx;
    // 只繪製在視窗內的部分
    if (drawX > mapX && drawX < mapX + mapW) {
      let edgeFade = map(abs(drawX - (mapX + mapW/2)), 0, mapW/2, 255, 0);
      fill(0, 242, 255, edgeFade);
      noStroke();
      circle(drawX, mapY + mapH/2, 4);
      
      textSize(8);
      textAlign(CENTER);
      text("SYS-" + hex(i + floor(distanceTraveled/(spacing*10))*10, 3), drawX, mapY - 5);
    }
  }

  // 繪製船艦目前位置中心線
  stroke(255, 0, 85, 200);
  strokeWeight(2);
  line(width/2, mapY - 5, width/2, mapY + mapH + 5);
  
  // 顯示導航數據文字
  fill(0, 242, 255, 180);
  textAlign(CENTER);
  textFont('Share Tech Mono');
  textSize(11);
  let distStr = nf(distanceTraveled / 1000, 1, 3);
  text(`NAV-TRACKER: ${distStr} LY FROM ORIGIN / SECTOR-${floor(distanceTraveled/10000)}`, width/2, mapY + mapH + 15);
  pop();
}

// 新增：側邊動態數據流 (十六進位座標)
function drawSideDataStreams() {
  push();
  fill(0, 242, 255, 80);
  textFont('Share Tech Mono');
  textSize(10);
  textAlign(LEFT);
  
  // 左側數據
  for(let i = 0; i < 20; i++) {
    let y = (i * 20 + frameCount * 2) % (height * 0.6) + height * 0.2;
    let hexVal = "0x" + Math.floor(noise(i, frameCount*0.01) * 65535).toString(16).toUpperCase();
    text(`SEC_L_${i}: ${hexVal}`, 10, y);
  }

  // 右側數據
  textAlign(RIGHT);
  for(let i = 0; i < 20; i++) {
    let y = (i * 20 + frameCount * 3) % (height * 0.6) + height * 0.2;
    let hexVal = "REF_" + Math.floor(noise(i+100, frameCount*0.01) * 999).toString();
    text(`${hexVal} [BUS_ACTIVE]`, width - 10, y);
  }
  pop();
}

// 新增：自定義 HUD 瞄準鏡與數據顯示
function drawHUD(ox, oy) {
  push();
  // 1. 右上角儀表數據
  fill(0, 242, 255, 200);
  textAlign(RIGHT);
  textFont('Share Tech Mono');
  textSize(16);
  let speed = isWarping ? "99,999 KM/S (WARP)" : "1,250 KM/S (CRUISE)";
  text(`VELOCITY: ${speed}`, width - 30, 40);
  
  // 新增：顯示座標與高度數據
  fill(0, 242, 255, 150);
  textSize(12);
  text(`LAT: ${nf(map(mouseX, 0, width, -90, 90), 2, 4)}`, width - 30, 65);
  text(`LNG: ${nf(map(mouseY, 0, height, -180, 180), 3, 4)}`, width - 30, 80);

  // 新增：生命維持系統數據 (微擾動)
  let o2 = 98 + noise(frameCount * 0.01) * 2;
  let temp = 42 + noise(frameCount * 0.005) * 10;
  fill(0, 255, 150, 180);
  text(`O2_LEVEL: ${nf(o2, 2, 1)}%`, width - 30, height - 60);
  text(`ENG_TEMP: ${nf(temp, 2, 1)}°C`, width - 30, height - 45);
  
  // 新增：能量波形圖 (Oscilloscope)
  let waveX = width - 180;
  let waveY = 130;
  noFill();
  stroke(0, 242, 255, 50);
  rect(waveX, waveY, 150, 40, 5);
  stroke(0, 255, 150, 200);
  beginShape();
  for (let i = 0; i < energyPulse.length; i++) {
    vertex(waveX + (i * 150 / (energyPulse.length - 1)), waveY + 20 + energyPulse[i]);
  }
  endShape();
  energyPulse.push(sin(frameCount * 0.2) * 10 + random(-2, 2));
  if (energyPulse.length > 40) energyPulse.shift();

  // 2. 左下角生物特徵掃描器 (攝影機畫面)
  let camX = 30;
  let camY = height - 200;

  push();
  // 讓 HUD 元件也受到視差偏移影響，增加空間感
  translate(ox * 0.5, oy * 0.5);
  // 繪製掃描視窗外框
  fill(0, 50);
  stroke(0, 242, 255, 150);
  rectMode(CORNER);
  rect(camX, camY, 160, 120);
  
  // 根據攝影機可用性顯示畫面
  if (isVideoAvailable) {
    // 繪製攝影機畫面 (水平翻轉使其像鏡子一樣自然)
    push();
    translate(camX + 160, camY);
    scale(-1, 1);
    image(video, 0, 0, 160, 120);
    pop();

    // 繪製動態掃描線 (僅在攝影機開啟時顯示)
    stroke(0, 242, 255, 200);
    let scanLineY = camY + (frameCount % 120);
    line(camX, scanLineY, camX + 160, scanLineY);

    // 檢查是否偵測到臉部並繪製追蹤 UI
    if (faces.length > 0) {
      fill(0, 255, 150, 200); // 變為綠色
      textSize(10);
      textAlign(LEFT);
      if (frameCount % 30 < 20) text("● IDENTITY SECURE", camX, camY - 10);
      
      noFill();
      stroke(0, 255, 150, 100);
      // 簡化追蹤框，避免雜亂
      rect(camX + 50, camY + 40, 60, 40, 2);
    } else {
      fill(0, 242, 255, 150);
      textSize(10);
      textAlign(LEFT);
      text("SCANNING...", camX, camY - 10);
    }
  } else {
    // 顯示預設頭像
    image(astronautImg, camX, camY, 160, 120);
    fill(255, 100, 100, 150);
    textSize(10);
    text("OFFLINE", camX + 5, camY + 115);
  }
  pop();

  let shieldStatus = shakeAmount > 5 ? "WARNING: IMPACT" : "SHIELD: STABLE";
  if (shakeAmount > 5 && frameCount % 10 < 5) fill(255, 0, 0); 
  text(shieldStatus, width - 30, 110);

  // 3. 自動導航狀態
  fill(isAutoPilot ? "#00ff96" : "#555");
  text(`AUTO-PILOT: ${isAutoPilot ? "ACTIVE" : "OFF"}`, width - 30, 90);

  // 4. 繪製雷達
  drawRadar(); // 雷達在 HUD 內部繪製，所以會被 drawHUD 的 push/pop 包裹

  // 移除這裡的重複繪製，改由 draw() 最後統一呼叫 drawMouseCursor()
  pop();
}

// 新增：獨立繪製自定義滑鼠游標，確保其在最上層
function drawMouseCursor() {
  push();
  translate(mouseX, mouseY);
  
  rotate(frameCount * 0.02);
  noFill();
  stroke(0, 242, 255, 200);
  strokeWeight(2);
  ellipse(0, 0, 40, 40);
  line(-25, 0, -15, 0);
  line(25, 0, 15, 0);
  line(0, -25, 0, -15);
  line(0, 25, 0, 15);
  
  // 隨滑鼠移動的外圈
  rotate(-frameCount * 0.05);
  strokeWeight(1);
  arc(0, 0, 55, 55, 0, PI/2);
  arc(0, 0, 55, 55, PI, 3*PI/2);
  pop();
}

// 新增：繪製戰術雷達
function drawRadar() {
  push();
  let rSize = 150;
  let rx = width - rSize/2 - 30;
  let ry = height - rSize/2 - 120;
  
  // 雷達底盤
  fill(0, 100, 100, 50);
  stroke(0, 242, 255, 150);
  strokeWeight(1);
  circle(rx, ry, rSize); // 外環
  
  noFill();
  stroke(0, 242, 255, 50);
  circle(rx, ry, rSize * 0.66);
  circle(rx, ry, rSize * 0.33);
  
  line(rx - rSize/2, ry, rx + rSize/2, ry);
  line(rx, ry - rSize/2, rx, ry + rSize/2);

  let sweep = map(sin(frameCount * 0.05), -1, 1, 0, rSize);
  stroke(0, 242, 255, 50);
  circle(rx, ry, sweep);

  // 繪製雷達上的物件點
  noStroke();
  for (let obj of spaceObjects) {
    let dotX = map(obj.x, -width, width, -rSize/2, rSize/2);
    let dotY = map(obj.z, 0, width, -rSize/2, rSize/2); // Z 軸映射到雷達 Y 軸
    
    if (obj.type === 'asteroid') {
      fill(255, 50, 50);
      // 新增：近距離警告圈圈
      let d = dist(dotX, dotY, 0, 0); // 計算與雷達中心的距離
      if (d < 35) { 
        push();
        noFill();
        stroke(255, 0, 0, 150 + sin(frameCount * 0.3) * 100); // 閃爍效果
        strokeWeight(1.5);
        let ringSize = 8 + sin(frameCount * 0.3) * 6; // 動態縮放圈圈
        circle(rx + dotX, ry + dotY, ringSize);
        pop();
      }
    }
    else if (obj.type === 'alien') fill(0, 255, 150);
    else fill(255);
    
    circle(rx + dotX, ry + dotY, 4);
  }
  pop();
}

// 新增：全螢幕模擬人臉掃描介面
function drawScanningInterface() {
  push();
  // 背景半透明黑色遮罩，讓掃描介面更突出
  fill(0, 220);
  noStroke();
  rect(0, 0, width, height);

  let scanW = min(width * 0.7, 640);
  let scanH = min(height * 0.7, 480);
  let x = (width - scanW) / 2;
  let y = (height - scanH) / 2;

  // 繪製科技感掃描外框
  stroke(0, 242, 255);
  strokeWeight(2);
  noFill();
  rect(x, y, scanW, scanH, 15);
  
  // 四角強化裝飾
  let cs = 40;
  strokeWeight(4);
  line(x, y, x + cs, y); line(x, y, x, y + cs);
  line(x + scanW, y, x + scanW - cs, y); line(x + scanW, y, x + scanW, y + cs);
  line(x, y + scanH, x + cs, y + scanH); line(x, y + scanH, x, y + scanH - cs);
  line(x + scanW, y + scanH, x + scanW - cs, y + scanH); line(x + scanW, y + scanH, x + scanW, y + scanH - cs);

  if (isVideoAvailable) {
    // 偵錯資訊：顯示 AI 狀態
    let aiStatus = !faceMesh ? "AI_LOADING" : (!isDetecting ? "AI_WAITING" : "AI_ACTIVE");
    fill(0, 242, 255, 100);
    textSize(10);
    text(`SYSTEM_VOICE: ${aiStatus}`, x + 10, y + 20);

    push();
    translate(x + scanW, y);
    scale(-1, 1);
    // 修正：確保影片寬高大於 0 且確實存在才繪製
    if (video && video.width > 0 && video.height > 0) {
      image(video, 0, 0, scanW, scanH);

      // 強健化點位偵測與繪製
      if (faces && faces.length > 0) {
        let face = faces[0];
        // 獲取點位資料 (支援 keypoints 或 landmarks 屬性)
        let pts = face.keypoints || face.landmarks;

        if (pts && pts.length > 0) {
          noFill();
          stroke(0, 255, 150, 200);
          strokeWeight(3); // 稍微加粗，確保清晰可見
          beginShape(POINTS);
          for (let i = 0; i < pts.length; i++) {
            let kp = pts[i];
            // 加上 NaN 檢查，防止 map 出錯
            let vx = map(kp.x, 0, video.width, 0, scanW);
            let vy = map(kp.y, 0, video.height, 0, scanH);
            if (!isNaN(vx) && !isNaN(vy)) {
              vertex(vx, vy);
            }
          }
          endShape();
        }
      }
    }

    // 新增：眼部與嘴部的戰術 HUD 追蹤動畫 (僅在 faces 有資料時執行)
    if (faces && faces.length > 0 && video.width > 0) {
      let face = faces[0];
      const features = [
        { pts: face.leftEye, label: "L-VISUAL", col: [0, 242, 255] },
        { pts: face.rightEye, label: "R-VISUAL", col: [0, 242, 255] },
        { pts: face.lips, label: "VOICE-BOX", col: [255, 255, 0] }
      ];

      features.forEach(f => {
        if (f.pts && f.pts.length > 0) {
          // 計算該區域所有特徵點的平均中心座標
          let cx = 0, cy = 0;
          f.pts.forEach(p => { cx += p.x; cy += p.y; });
          cx = map(cx / f.pts.length, 0, video.width, 0, scanW);
          cy = map(cy / f.pts.length, 0, video.height, 0, scanH);

          push();
          translate(cx, cy);
          scale(-1, 1); // 重要：抵消父層的 scale(-1, 1)，讓文字與 UI 元素不會被鏡像翻轉
          
          // 繪製旋轉偵測環
          noFill();
          stroke(f.col[0], f.col[1], f.col[2], 180);
          strokeWeight(1.5);
          rotate(frameCount * 0.08);
          arc(0, 0, 50, 50, 0, HALF_PI);
          arc(0, 0, 50, 50, PI, PI + HALF_PI);
          
          // 繪製中心瞄準十字
          line(-12, 0, 12, 0);
          line(0, -12, 0, 12);
          
          // 顯示特徵標籤與動態 ID 碼
          fill(f.col);
          noStroke();
          textSize(10);
          textAlign(LEFT, CENTER);
          text(`${f.label}\nID: ${hex(floor(cx + cy), 4)}`, 35, 0);
          pop();
        }
      });
    }

    pop();
  } else if (!cameraError) {
    fill(255, 50, 50, 50);
    rect(x, y, scanW, scanH, 15);
    fill(255);
    textAlign(CENTER, CENTER);
    text("INITIALIZING CAMERA...", width/2, height/2);
  } else {
    fill(255, 100, 100);
    textAlign(CENTER, CENTER);
    text("ERROR: NO CAMERA DEVICE FOUND", width/2, height/2);
  }

  // 動態上下移動的掃描線
  stroke(0, 242, 255, 180);
  strokeWeight(3);
  // 使用 deltaTime 確保掃描線移動速度與幀率無關 (每秒移動 scanH * 0.5 像素)
  scanLinePos = (scanLinePos + (scanH / 2) * (deltaTime / 1000)) % scanH;
  let lineY = y + scanLinePos;
  line(x - 10, lineY, x + scanW + 10, lineY);
  
  // 掃描文字狀態
  fill(0, 242, 255);
  noStroke();
  textAlign(CENTER);
  textSize(24);
  textFont('Orbitron');
  let statusTxt = faces.length > 0 ? "TARGET ACQUIRED: ACCESS GRANTED" : "ANALYZING BIOMETRICS...";
  if (faces.length > 0 && frameCount % 20 < 10) fill(0, 255, 150);
  text(statusTxt, width/2, y - 30);

  // 退出按鈕：僅在偵測到人臉時才「跳出」
  if (faces.length > 0) {
    let closeX = width/2;
    let closeY = y - 80; // 修正：將按鈕繪製位置移至掃描框上方
    fill(0, 255, 150, 200); // 辨識成功使用綠色 HUD 風格
    rectMode(CENTER);
    rect(closeX, closeY, 280, 50, 10); // 再度增加寬度，確保文字不超出
    fill(255);
    textSize(18);
    text("IDENTITY VERIFIED: CLOSE", closeX, closeY + 7);
  }
  pop();
}

// 新增：護盾碰撞漣漪效果
function drawShieldEffect() {
  if (shakeAmount > 5) {
    push();
    noFill();
    // 使用 shakeAmount 控制漣漪的擴散
    let rippleSize = map(shakeAmount, 20, 0, 100, width * 1.5);
    let alpha = map(shakeAmount, 20, 0, 200, 0);
    stroke(0, 242, 255, alpha);
    strokeWeight(2);
    
    // 繪製多重圓環模擬護盾
    ellipse(width/2, height/2, rippleSize, rippleSize * 0.6);
    ellipse(width/2, height/2, rippleSize * 0.8, rippleSize * 0.5);
    
    pop();
  }
}

// 繪製雷射動畫
function drawLasers() {
  push();
  // 繪製雷射時加入發光模糊
  drawingContext.shadowBlur = 10;
  drawingContext.shadowColor = 'cyan';
  for (let i = lasers.length - 1; i >= 0; i--) {
    let l = lasers[i];
    stroke(0, 255, 255, map(l.life, 0, 5, 0, 255));
    strokeWeight(l.life * 2);
    
    // 從座艙邊角射向目標
    line(0, height, l.x, l.y);
    line(width, height, l.x, l.y);

    // 擊中點閃光
    noStroke();
    fill(255, 255, 255, map(l.life, 0, 5, 0, 150));
    ellipse(l.x, l.y, (5 - l.life) * 20);

    l.life--;
    if (l.life <= 0) lasers.splice(i, 1);
  }
  pop();
}

// 新增：處理粒子的更新與繪製
function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].display();
    if (particles[i].life <= 0) {
      particles.splice(i, 1);
    }
  }
}

// 新增：處理得分浮動文字
// 新增：手動初始化生物特徵辨識（攝影機與臉部偵測）
function initBiometrics() {
  isDetecting = false; // 每次重置狀態
  faces = [];
  if (video) {
    // 如果已經有 video，只需重啟偵測
    if (faceMesh && !isDetecting) {
      faceMesh.detectStart(video.elt, (results) => { faces = results; });
      isDetecting = true;
    }
    return;
  }

  // 重新設計的初始化流程
  video = createCapture(VIDEO, () => {
    isVideoAvailable = true;
    video.size(320, 240);
    video.hide();
    
    const options = { maxFaces: 1, flipHorizontal: false };
    if (!faceMesh) {
      faceMesh = ml5.faceMesh(options, () => {
        faceMesh.detectStart(video.elt, (results) => { faces = results; });
        isDetecting = true;
      });
    } else {
      faceMesh.detectStart(video.elt, (results) => { faces = results; });
      isDetecting = true;
    }
  });

  video.elt.onerror = () => { cameraError = true; };
}

// 新增：碎裂粒子類別
class Particle {
  constructor(x, y, col) {
    this.x = x;
    this.y = y;
    this.vx = random(-5, 5); // 隨機水平速度
    this.vy = random(-5, 5); // 隨機垂直速度
    this.life = 255;         
    this.col = col;          // 繼承物件的顏色
    this.size = random(2, 5);
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 10; // 粒子逐漸消失
  }
  display() {
    noStroke();
    fill(this.col[0], this.col[1], this.col[2], this.life);
    ellipse(this.x, this.y, this.size);
  }
}

// 新增：背景行星類別
class Planet {
  constructor() {
    this.reset();
  }

  reset() {
    this.z = random(width * 2, width * 5); // 初始深度，比太空物件更遠
    this.x = random(-width, width);
    this.y = random(-height, height);
    this.baseRadius = random(50, 200); // 行星基礎大小
    this.color = color(random(50, 150), random(50, 150), random(100, 200)); // 藍紫色調
    this.rotation = random(TWO_PI);
    this.rotationSpeed = random(-0.0005, 0.0005); // 極慢自轉
    this.speed = random(0.5, 1.5); // 接近速度
    this.hasRing = random(1) < 0.6; // 60% 機率產生行星環
    this.ringTilt = random(-0.5, 0.5); // 環的隨機傾斜角度
  }

  update() {
    let currentSpeed = isWarping ? this.speed * 10 : this.speed; // 飛行模式下接近更快
    this.z -= currentSpeed;
    this.rotation += this.rotationSpeed;

    if (this.z < 1) { // 如果行星已經「穿過」視角，重置
      this.reset();
    }
  }

  display(ox, oy) {
    // 將 3D 座標映射到 2D 螢幕
    let safeZ = max(this.z, 0.1); // 確保 z 值不會過小
    let sx = map(this.x / safeZ, -1, 1, 0, width);
    let sy = map(this.y / safeZ, -1, 1, 0, height);
    // 半徑隨 z 值變化，越近越大
    let r = map(this.z, 0, width * 5, this.baseRadius * 2, this.baseRadius * 0.1);

    // 應用視差偏移 (比太空物件小，比星星大)
    sx += ox * 0.3; 
    sy += oy * 0.3;

    // 深度衰減：越遠越暗，並與背景色融合
    let depthMix = map(this.z, 0, width * 5, 1, 0);
    let finalCol = lerpColor(color(5, 5, 20), this.color, depthMix);

    push();
    translate(sx, sy);
    rotate(this.rotation);

    // 0. 繪製多層次碎石環 (Saturn-like Multi-layer Rings)
    if (this.hasRing) {
      push();
      rotate(this.ringTilt);
      noFill();

      let r_val = red(this.color);
      let g_val = green(this.color);
      let b_val = blue(this.color);

      // 層次 A: 內環 (較暗、較密集)
      stroke(r_val + 20, g_val + 20, b_val + 10, 80);
      strokeWeight(r * 0.08);
      drawingContext.setLineDash([r * 0.1, r * 0.04]);
      ellipse(0, 0, r * 1.7, r * 0.3);

      // 層次 B: 主環 (最亮、寬度較大)
      stroke(r_val + 60, g_val + 60, b_val + 40, 150);
      strokeWeight(r * 0.12);
      drawingContext.setLineDash([r * 0.3, r * 0.1]);
      ellipse(0, 0, r * 2.1, r * 0.4);

      // 層次 C: 外環 (極細、虛幻感)
      stroke(r_val + 30, g_val + 30, b_val + 60, 60);
      strokeWeight(r * 0.02);
      drawingContext.setLineDash([r * 0.05, r * 0.05]);
      ellipse(0, 0, r * 2.4, r * 0.5);

      drawingContext.setLineDash([]); // 繪製完後重置虛線設定
      pop();
    }

    // 1. 大氣層暈光 (Glow Effect)
    noStroke();
    for (let i = 0; i < 3; i++) {
      fill(red(finalCol), green(finalCol), blue(finalCol), map(this.z, 0, width * 5, 15, 0));
      ellipse(0, 0, r * (1.1 + i * 0.05));
    }

    // 2. 行星本體
    fill(finalCol);
    ellipse(0, 0, r);

    // 3. 簡單的表面紋理 (線條)
    stroke(this.color.levels[0] + 30, this.color.levels[1] + 30, this.color.levels[2] + 30, 80);
    strokeWeight(1);
    for (let i = 0; i < 5; i++) {
      ellipse(0, 0, r * (0.5 + i * 0.1), r * (0.8 - i * 0.05));
    }

    // 4. 陰影 (營造立體感)
    let ctx = drawingContext;
    // 修正：模擬遠方恆星作為單一光源的陰影效果
    let grad = ctx.createRadialGradient(-r * 0.4, -r * 0.4, r * 0.05, 0, 0, r);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.1)'); // 受光面
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');   // 晨昏線
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.9)');     // 背光面
    ctx.fillStyle = grad;
    ellipse(0, 0, r);

    pop();
  }
}

// 新增：停止生物特徵辨識並完全釋放攝影機資源
function stopBiometrics() {
  if (video) {
    // 1. 停止 ml5.js 的臉部偵測偵測循環
    if (faceMesh) {
      faceMesh.detectStop();
    }
    isDetecting = false;

    // 2. 取得影片原始串流並停止所有軌道（這才會關閉攝影機硬體燈光）
    let stream = video.elt.srcObject;
    if (stream) {
      let tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
    }

    // 3. 移除 p5.js 建立的影片 DOM 元件
    video.remove();
    
    // 4. 重置變數狀態
    video = null;
    isVideoAvailable = false;
    faces = [];
  }
}

function closeProject() {
  document.getElementById('gallery-container').style.display = 'none';
  document.getElementById('project-frame').src = "";
  isScanningMode = false; // 同步關閉全螢幕掃描狀態
  stopBiometrics(); // 關閉視窗時觸發停止攝影機
}

function loadProject(url) {
  console.log("正在載入專案：", url);
  isScanningMode = false; // 切換專案時關閉掃描模式
  stopBiometrics(); // 在切換不同專案時，也先確保攝影機是關閉的

  let container = document.getElementById('gallery-container');
  let iframe = document.getElementById('project-frame');

  if (!container || !iframe) return;

  // 隨機產生視窗位置 (保持在螢幕可見範圍內)
  // 視窗寬度為 40%，高度為 60%，因此 left 最大 60%，top 最大 40%
  let randomX = random(5, 55); // 留一點邊距，範圍在 5% 到 55%
  let randomY = random(5, 35); // 範圍在 5% 到 35%
  
  container.style.left = randomX + '%';
  container.style.top = randomY + '%';

  container.style.display = 'block';
  iframe.src = url;
}

// 打字機效果函式：自動跳過 HTML 標籤以確保樣式正確
function startTypewriter(id, text, speed, callback) {
  let i = 0;
  let elem = document.getElementById(id);
  if (!elem) return;
  
  // 每次開始前先清除舊的計時器並清空內容
  clearTimeout(typewriterTimeout);
  elem.innerHTML = "";

  function type() {
    if (i < text.length) {
      if (text.charAt(i) === '<') {
        // 如果遇到 HTML 標籤，一次性跳到標籤結束
        let tagEnd = text.indexOf('>', i);
        elem.innerHTML += text.substring(i, tagEnd + 1);
        i = tagEnd + 1;
      } else {
        elem.innerHTML += text.charAt(i);
        i++;
      }
      typewriterTimeout = setTimeout(type, speed);
    } else if (callback) {
      callback();
    }
  }
  type();
}

// 實作視窗拖動邏輯
function initDraggable() {
  let container = document.getElementById('gallery-container');
  let header = document.getElementById('gallery-header');
  let iframe = document.getElementById('project-frame');
  let resizer = document.getElementById('resizer');
  
  if (!header || !container || !iframe || !resizer) return; // 安全檢查

  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

  header.onmousedown = (e) => {
    e = e || window.event;
    e.preventDefault();
    // 記錄初始滑鼠位置
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    // 拖動時讓視窗半透明
    container.style.opacity = 0.7;
    // 拖動時關閉 iframe 的滑鼠事件，避免拖動中斷
    iframe.style.pointerEvents = 'none';

    document.onmouseup = () => {
      document.onmouseup = null;
      document.onmousemove = null;
      // 放下時恢復不透明
      container.style.opacity = 1.0;
      iframe.style.pointerEvents = 'auto'; // 停止拖動後恢復
    };

    document.onmousemove = (e) => {
      e = e || window.event;
      e.preventDefault();
      // 計算滑鼠位移
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      // 設定新的視窗位置
      container.style.top = (container.offsetTop - pos2) + "px";
      container.style.left = (container.offsetLeft - pos1) + "px";
    };
  };

  // 新增：調整大小邏輯
  resizer.onmousedown = (e) => {
    e = e || window.event;
    e.preventDefault();
    
    iframe.style.pointerEvents = 'none'; // 縮放時關閉 iframe 滑鼠事件

    document.onmousemove = (e) => {
      e = e || window.event;
      e.preventDefault();
      
      // 計算新的寬度與高度
      let rect = container.getBoundingClientRect();
      let newW = e.clientX - rect.left;
      let newH = e.clientY - rect.top;

      // 設定最小尺寸限制，避免視窗縮小到消失
      container.style.width = Math.max(200, newW) + "px";
      container.style.height = Math.max(200, newH) + "px";
    };

    document.onmouseup = () => {
      document.onmouseup = null;
      document.onmousemove = null;
      iframe.style.pointerEvents = 'auto'; // 恢復
    };
  };
}

class Star {
  constructor() {
    this.x = random(-width, width);
    this.y = random(-height, height);
    this.z = random(width);
    this.pz = this.z;
    this.size = random(1, 3);
    this.speed = random(10, 20); // 飛行模式的速度
  }
  update() {
    if (isWarping) {
      this.pz = this.z;
      this.z -= this.speed;
      if (this.z < 1) {
        this.z = width;
        this.x = random(-width, width);
        this.y = random(-height, height);
        this.pz = this.z;
      }
    } else {
      // 一般模式：緩慢橫向移動
      this.x += 0.5;
      if (this.x > width) this.x = -width;
      this.z = width; // 保持固定深度
      this.pz = this.z;
    }
  }
  display(ox, oy) {
    let safeZ = max(this.z, 0.1); // 確保 z 值不會過小，避免除以接近零的數
    let sx = map(this.x / safeZ, -1, 1, 0, width);
    let sy = map(this.y / safeZ, -1, 1, 0, height);
    let twinkle = 150 + sin(frameCount * 0.1 + this.x) * 105; // 隨機閃爍邏輯

    if (isWarping) {
      stroke(255, twinkle);
      strokeWeight(this.size);
      let px = map(this.x / max(this.pz, 0.1), -1, 1, 0, width); // 同樣確保 pz 不會過小
      let py = map(this.y / max(this.pz, 0.1), -1, 1, 0, height);
      line(px, py, sx, sy);
    } else {
      noStroke();
      fill(255, twinkle);
      ellipse(sx + ox, sy + oy, this.size);
    }
  }
}

// 新增：太空物件類別（隕石、外星人、太空人）
class SpaceObject {
  constructor() {
    this.reset();
  }

  reset() {
    this.z = width; // 從遠處產生
    this.type = random(['asteroid', 'alien', 'astronaut', 'comet']);

    // 修正：擴大生成範圍到全螢幕寬度，解決左右看不到隕石的問題
    if (this.type === 'comet') {
      this.x = random(-width, width);
      this.y = random(-height, height);
      this.speed = random(15, 25); // 彗星速度極快
    } else {
      this.x = random(-width, width);
      this.y = random(-height, height);
      this.speed = random(3, 8);
    }

    this.rot = random(TWO_PI);
    this.rotSpeed = random(-0.05, 0.05);
  }

  update(mx, my) {
    // 飛行模式時速度加快
    let currentSpeed = isWarping ? this.speed * 5 : this.speed;
    this.z -= currentSpeed;
    this.rot += this.rotSpeed;

    // 如果飛出螢幕或到達前方，重置位置
    if (this.z < 1) {
      // 修正：從隨機撞擊改為物理位置判定
      // 判斷隕石在 z=0 時，是否落在視窗中心(船體)附近
      // mx/my 是視差位移，會影響物件在螢幕上的最終位置
      let screenDist = dist(this.x + mx * 1.5, this.y + my * 1.5, 0, 0);
      
      if (this.type === 'asteroid' && screenDist < 80 && !isAutoPilot) { 
        shakeAmount = 25; // 撞擊
      }
      this.reset();
    }
  }

  // 新增：檢查是否被雷射擊中
  checkHit(mx, my, ox = 0, oy = 0) {
    let sx = map(this.x / this.z, -1, 1, 0, width) + ox * 1.5;
    let sy = map(this.y / this.z, -1, 1, 0, height) + oy * 1.5;
    let r = map(this.z, 0, width, 50, 2);
    
    // 判斷滑鼠點擊是否在物件投影範圍內
    return dist(mx, my, sx, sy) < r;
  }

  display(ox, oy) {
    let safeZ = max(this.z, 0.1); // 確保 z 值不會過小
    let sx = map(this.x / safeZ, -1, 1, 0, width) + ox * 1.5;
    let sy = map(this.y / safeZ, -1, 1, 0, height) + oy * 1.5;
    let r = map(this.z, 0, width, 50, 2); // 越近越大

    push();
    translate(sx, sy);
    rotate(this.rot);
    noStroke();

    // 新增：目標鎖定 UI (AR 效果)
    if (this.z < width * 0.8) {
      push();
      rotate(-this.rot); // 讓 UI 框保持水平不隨物件旋轉
      noFill();
      // 如果距離過近 (z < 200)，框框變紅並閃爍
      if (this.z < 200 && frameCount % 20 < 10) {
        stroke(255, 50, 50);
      } else {
        stroke(0, 242, 255, 150);
      }
      let bSize = r * 1.5; // 括號大小
      line(-bSize, -bSize, -bSize + 5, -bSize); line(-bSize, -bSize, -bSize, -bSize + 5); // 左上
      line(bSize, -bSize, bSize - 5, -bSize); line(bSize, -bSize, bSize, -bSize + 5); // 右上
      line(-bSize, bSize, -bSize + 5, bSize); line(-bSize, bSize, -bSize, bSize - 5); // 左下
      line(bSize, bSize, bSize - 5, bSize); line(bSize, bSize, bSize, bSize - 5); // 右下
      
      textSize(10);
      fill(0, 242, 255, 120);
      text(this.type.toUpperCase() + " / DIST: " + floor(this.z), bSize + 5, 0);
      pop();
    }

    if (this.type === 'asteroid') {
      // 繪製隕石 (不規則圓形)
      fill(100, 80, 70);
      beginShape();
      for(let a=0; a<TWO_PI; a+=0.5) {
        let offset = random(r*0.8, r*1.2);
        vertex(cos(a)*offset, sin(a)*offset);
      }
      endShape(CLOSE);
    } 
    else if (this.type === 'comet') {
      // 繪製彗星 (金黃色發光體與拖尾)
      push();
      rotate(-this.rot); 
      fill(255, 215, 0, 200);
      ellipse(0, 0, r, r);
      for(let i=1; i<8; i++) {
        fill(255, 150, 0, 200 - i*25);
        ellipse(-i*r*0.4, 0, r*(1-i*0.1), r*(1-i*0.1));
      }
      pop();
    } 
    else if (this.type === 'alien') {
      // 繪製外星人 (綠色頭部)
      fill(0, 255, 100);
      ellipse(0, 0, r, r * 1.2);
      fill(0);
      ellipse(-r/4, -r/10, r/3, r/5); // 左眼
      ellipse(r/4, -r/10, r/3, r/5);  // 右眼
    } 
    else if (this.type === 'astronaut') {
      // 繪製太空人 (簡化版：頭盔與身體)
      fill(255);
      noStroke();
      rectMode(CENTER);
      rect(0, r/2, r, r); // 身體
      fill(200, 230, 255);
      ellipse(0, 0, r*0.8, r*0.7); // 頭盔鏡面

      stroke(255);
      strokeWeight(r/10);
      noFill();
      arc(0, r/2, r*1.5, r, 0, PI); // 氧氣管線
    }

    pop();
  }
}
