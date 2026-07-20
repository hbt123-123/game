// 狼人杀桥接模块：加载编译后的 TS 产物，适配 GameHub 游戏模块接口
// 通过补丁 Module._resolveFilename 解析 @shared/* 别名，无需额外依赖
var path = require('path');
var Module = require('module');

var sharedPath = path.resolve(__dirname, 'server', 'dist', 'shared');

// 补丁模块解析：将 @shared/* 映射到 dist/shared/*
var originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
    if (request.indexOf('@shared/') === 0) {
        var subPath = request.substring('@shared/'.length);
        request = path.join(sharedPath, subPath);
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
};

module.exports = function (io) {
    var werewolfSetup;
    try {
        werewolfSetup = require('./server/dist/server/src/ws');
    } catch (err) {
        console.error('[werewolf] 加载后端失败：', err.message);
        console.error('[werewolf] 请先在 games/werewolf/server/ 执行 npm install && npm run build');
        throw err;
    }
    werewolfSetup.setup(io);
    console.log('Werewolf(狼人杀) 已加载');
    return { name: '狼人杀', route: '/werewolf', socketPath: '/werewolf/socket.io' };
};