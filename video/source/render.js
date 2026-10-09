const {chromium}=require('playwright');const {spawn}=require('child_process');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('file://'+__dirname+'/scene.html');await p.waitForFunction(()=>window.ready);
const out=process.argv[2];
const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate','30','-c:v','mjpeg','-i','-','-i','music.wav',
 '-c:v','libx264','-preset','slow','-crf','17','-pix_fmt','yuv420p','-profile:v','high','-c:a','aac','-b:a','192k',
 '-t','30','-movflags','+faststart',out],{stdio:['pipe','inherit','inherit']});
for(let i=0;i<900;i++){const d=await p.evaluate(t=>{render(t);return cv.toDataURL('image/jpeg',.95)},i/30);
 if(!ff.stdin.write(Buffer.from(d.split(',')[1],'base64')))await new Promise(r=>ff.stdin.once('drain',r));
 if(i%150===0)console.log('frame',i)}
ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();console.log('done')})();
