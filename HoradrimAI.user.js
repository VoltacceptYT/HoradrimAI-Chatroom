// ==UserScript==
// @name         HoradrimAI Overlay
// @namespace    https://voltacceptyt.github.io/HoradrimAI
// @version      3.5
// @description  A draggable, resizable browser overlay styled like Windows 7 IE, with minimize-to-desktop-icon, and grid snapping.
// @author       Github Copilot, Microsoft Copilot, Voltaccept, BlackboxAI
// @match        *://google.com/
// @match        *://*.google.com/
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const HOME_URL = 'https://voltacceptyt.github.io/HoradrimAI/';
    const ICON_URL = 'https://voltacceptyt.github.io/HoradrimAI/assets/icon.png';
    const GRID_SIZE = 64;

    const style = document.createElement('style');
    style.textContent = `
        #ie7-overlay {
            position: fixed;
            top: 100px;
            left: 100px;
            width: 565px;
            height: 382px;
            background: rgba(180, 210, 255, 0.6); /* More opaque and blue-tinted */
            backdrop-filter: blur(14px) saturate(1.5) brightness(1.1); /* Enhanced glassy effect */
            border: 0px solid rgba(120, 160, 220, 0.7);
            border-radius: 6px;
            box-shadow: 0 0 14px rgba(0,0,0,0.45);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            min-height: 0;
            font-family: 'Segoe UI', sans-serif;
            resize: both;
            overflow: hidden;
        }

        #ie7-header {
            background: linear-gradient(to bottom, rgba(255,255,255,0.6), rgba(200,220,240,0.4));
            padding: 4px 8px 4px 8px;
            cursor: move;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid rgba(160,160,160,0.5);
            user-select: none;
        }

        #ie7-titlebar {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        #ie7-title {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        /* Remove inline img, now use background */
        #ie7-title .ie7-title-icon {
            width: 16px;
            height: 16px;
            background-image: url('${ICON_URL}');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            display: inline-block;
            flex-shrink: 0;
            image-rendering: auto;
            pointer-events: none;
            /* prevent drag/copy */
            user-drag: none;
            -webkit-user-drag: none;
        }

        #ie7-title span {
            font-weight: bold;
            color: #1a1a1a;
            text-shadow: 0 1px 0 #fff;
        }

        .ie7-button {
            width: 26px;
            height: 26px;
            border: 1px solid #5a8ac6;
            border-radius: 50%;
            background: linear-gradient(to bottom, #dbeeff, #a4cfff);
            box-shadow: inset 0 1px 0 #ffffff;
            color: #003366;
            font-weight: bold;
            font-size: 14px;
            cursor: pointer;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .ie7-button:hover {
            background: linear-gradient(to bottom, #c0e0ff, #8fc4ff);
        }

        #ie7-controls {
            position: absolute;
            top: 0;
            right: 5px;
            display: flex;
        }

        #ie7-minimize {
            background: linear-gradient(to bottom, #eee, #ccc);
            color: #333;
            border: 1px solid #666;
            border-right: none;
            border-top-left-radius: 0;
            border-top-right-radius: 0;
            border-bottom-left-radius: 3px;
            border-bottom-right-radius: 0;
            width: 26px;
            height: 18px;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            margin-bottom: 10px;
        }

        #ie7-close {
            background: linear-gradient(to bottom, #f66, #c00);
            color: white;
            border: 1px solid #900;
            border-top-left-radius: 0;
            border-top-right-radius: 0;
            border-bottom-left-radius: 0;
            border-bottom-right-radius: 3px;
            font-weight: bold;
            text-shadow: 0 -1px 0 #600;
            width: 52px;
            height: 18px;
            font-size: 12px;
            cursor: pointer;
            margin-bottom: 10px;
        }

        #ie7-desktop-icon {
            position: fixed;
            top: 64px;
            left: 64px;
            width: 80px;
            text-align: center;
            font-size: 13px;
            font-family: 'Segoe UI', sans-serif;
            color: white;
            text-shadow: 1px 1px 2px black;
            cursor: default;
            z-index: 9999;
            display: none;
            user-select: none;
        }

        /* Desktop icon uses background image */
        #ie7-desktop-icon .ie7-desktop-icon-img {
            width: 48px;
            height: 48px;
            background-image: url('${ICON_URL}');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            margin-bottom: 4px;
            display: inline-block;
            pointer-events: none;
            user-drag: none;
            -webkit-user-drag: none;
        }

        #ie7-browser {
            flex: 1;
            width: 100%;
            border: none;
            min-height: 0;
        }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'ie7-overlay';
    overlay.innerHTML = `
        <div id="ie7-header">
            <div id="ie7-titlebar">
                <div id="ie7-title">
                    <span class="ie7-title-icon"></span>
                    <span>HoradrimAI</span>
                </div>
                <!-- Home button removed -->
            </div>
            <div id="ie7-controls">
                <button id="ie7-minimize">—</button>
                <button id="ie7-close">✖</button>
            </div>
        </div>
        <iframe id="ie7-browser" src="${HOME_URL}"></iframe>
    `;
    document.body.appendChild(overlay);

    const desktopIcon = document.createElement('div');
    desktopIcon.id = 'ie7-desktop-icon';
    desktopIcon.innerHTML = `
        <span class="ie7-desktop-icon-img"></span>
        <div>HoradrimAI</div>
    `;
    document.body.appendChild(desktopIcon);

    // Drag overlay via header
    const header = document.getElementById('ie7-header');
    let draggingOverlay = false, offsetX = 0, offsetY = 0;
    header.addEventListener('mousedown', (e) => {
        draggingOverlay = true;
        offsetX = e.clientX - overlay.offsetLeft;
        offsetY = e.clientY - overlay.offsetTop;
        e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
        if (draggingOverlay) {
            overlay.style.left = `${e.clientX - offsetX}px`;
            overlay.style.top = `${e.clientY - offsetY}px`;
        }
    });
    document.addEventListener('mouseup', () => draggingOverlay = false);

    // Drag desktop icon with grid snap
    let draggingIcon = false, iconOffsetX = 0, iconOffsetY = 0;
    desktopIcon.addEventListener('mousedown', (e) => {
        draggingIcon = true;
        iconOffsetX = e.clientX - desktopIcon.offsetLeft;
        iconOffsetY = e.clientY - desktopIcon.offsetTop;
    });
    document.addEventListener('mousemove', (e) => {
        if (draggingIcon) {
            const x = Math.round((e.clientX - iconOffsetX) / GRID_SIZE) * GRID_SIZE;
            const y = Math.round((e.clientY - iconOffsetY) / GRID_SIZE) * GRID_SIZE;
            desktopIcon.style.left = `${x}px`;
            desktopIcon.style.top = `${y}px`;
        }
    });
    document.addEventListener('mouseup', () => draggingIcon = false);

    // Double-click to restore
    desktopIcon.addEventListener('dblclick', () => {
        overlay.style.display = 'flex';
        desktopIcon.style.display = 'none';
    });

    // Minimize
    document.getElementById('ie7-minimize').onclick = () => {
        overlay.style.display = 'none';
        desktopIcon.style.display = 'block';
    };

    // Close
    document.getElementById('ie7-close').onclick = () => {
        overlay.remove();
        desktopIcon.remove();
    };

    // Home button logic removed since button is gone
})();
