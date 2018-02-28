//
//  Created by Mingliang Chen on 18/2/28.
//  illuspas[a]gmail.com
//  Copyright (c) 2018 Nodemedia. All rights reserved.
//
const EventEmitter = require('events');
const Url = require('url');
const Net = require('net');
const { RtmpClient } = require('node-media-streamer');

const RTMP_PORT = 1935;

class NodeRtmpRelay extends EventEmitter {
  constructor(options) {
    super();
    this.pullInfo = null;
    this.pullSocket = null;
    this.pullRtmp = null;

    this.pushInfo = null;
    this.pushSocket = null;
    this.pushRtmp = null;
  }

  setPull(url) {
    this.pullInfo = this.parser(url);
    this.pullRtmp = new RtmpClient(this.pullInfo.app, this.pullInfo.stream, this.pullInfo.tcurl);
    console.log(this.pullInfo);
  }

  setPush(url) {
    this.pushInfo = this.parser(url);
    this.pushRtmp = new RtmpClient(this.pushInfo.app, this.pushInfo.stream, this.pushInfo.tcurl);
    console.log(this.pushInfo);
  }

  run() {
    if (!this.pullInfo || !this.pushInfo) {
      console.error('pullUrl or pushUrl is null');
      return;
    }
    this.pullSocket = Net.createConnection(this.pullInfo.port, this.pullInfo.hostname, () => {
      this.pullRtmp.startPull();
    });
    this.pushSocket = Net.createConnection(this.pushInfo.port, this.pushInfo.hostname, () => {
      this.pushRtmp.startPush();
    });

    this.pullSocket.on('data', (data) => {
      this.pullRtmp.inputData(data, data.length);
    });

    this.pullRtmp.on('send', (header, payload) => {
      this.pullSocket.write(Buffer.from(header));
      this.pullSocket.write(Buffer.from(payload));
    });

    this.pushSocket.on('data', (data) => {
      this.pushRtmp.inputData(data, data.length);
    });
    this.pushRtmp.on('send', (header, payload) => {
      this.pushSocket.write(Buffer.from(header));
      this.pushSocket.write(Buffer.from(payload));
    });

    this.pullRtmp.on('audio', (audio, time) => {
      this.pushRtmp.pushAudio(audio, audio.length, time);
    });
    this.pullRtmp.on('video', (video, time) => {
      this.pushRtmp.pushVideo(video, video.length, time);
    });
    this.pullRtmp.on('script', (script, time) => {
      this.pushRtmp.pushScript(script, script.length, time);
    });

    this.pullRtmp.on('status', (code, level, description) => {
      console.log('[pull]', code, level, description);
    });

    this.pushRtmp.on('status', (code, level, description) => {
      console.log('[push]', code, level, description);
    });
  }

  stop() {

  }

  parser(url) {
    let urlInfo = Url.parse(url, true);
    urlInfo.app = urlInfo.path.split('/')[1];
    urlInfo.port = !!urlInfo.port ? urlInfo.port : RTMP_PORT;
    urlInfo.tcurl = urlInfo.href.match(/rtmp:\/\/([^\/]+)\/([^\/]+)/)[0];
    urlInfo.stream = urlInfo.path.slice(urlInfo.app.length + 2);
    return urlInfo;
  }
}
let nrr = new NodeRtmpRelay();
nrr.setPull("rtmp://live.hkstv.hk.lxdns.com/live/hks");
nrr.setPush("rtmp://192.168.0.10/live/stream");
nrr.run();
module.exports = NodeRtmpRelay;