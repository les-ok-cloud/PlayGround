#!/usr/bin/env bash
set -euo pipefail
# Mood Tracker static server.
# - Changes to its directory, installs/builds when needed, writes deployment-output.json,
#   and serves in the foreground on PORT (default 3000).
cd "$(dirname "$0")"
PROJECT_ROOT="$(pwd)"
PORT="${PORT:-3000}"
export PORT
WEB_DIR="${OPENCODE_WEB_DIR:-$PROJECT_ROOT/.opencode-web}"

/usr/bin/time -p test -f "$PROJECT_ROOT/index.html"
/usr/bin/time -p node -e '
const fs=require("node:fs"), path=require("node:path");
const root=process.env.PROJECT_ROOT||process.cwd();
const web=process.env.WEB_DIR||require("node:path").join(root,".opencode-web");
fs.mkdirSync(web,{recursive:true});
fs.writeFileSync(path.join(web,"deployment-output.json"), JSON.stringify({project:root,directory:root}));
console.log("wrote deployment-output.json -> "+path.join(web,"deployment-output.json"));
' 
PROJECT_ROOT="$PROJECT_ROOT" WEB_DIR="$WEB_DIR" /usr/bin/time -p bash -c '
if [ -f package.json ]; then
  if node -e "const p=require(\"./package.json\"); process.exit(p.devDependencies?.vite||p.dependencies?.vite?0:1)"; then
    echo "vite project detected: installing and building"
    if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
    npm run build
  else
    echo "package.json present without vite: no build step"
  fi
else
  echo "static html project: no install/build needed"
fi
'
/usr/bin/time -p node -e '
const http=require("node:http"), fs=require("node:fs"), path=require("node:path");
const root=process.env.PROJECT_ROOT||process.cwd();
const port=Number(process.env.PORT||3000);
const mime={".html":"text/html",".js":"application/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".webp":"image/webp",".wasm":"application/wasm",".glb":"model/gltf-binary"};
const server=http.createServer((req,res)=>{
  try{
    const urlPath=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
    let file=path.resolve(root,"."+urlPath);
    if(file!==path.resolve(root)&&!file.startsWith(path.resolve(root)+"/")){res.writeHead(404);res.end();return;}
    if(fs.statSync(file).isDirectory()) file=path.join(file,"index.html");
    res.setHeader("Content-Type",mime[path.extname(file)]||"application/octet-stream");
    res.setHeader("Cache-Control","no-cache");
    res.end(fs.readFileSync(file));
  }catch{res.writeHead(404);res.end("Not found");}
});
server.listen(port,"0.0.0.0",()=>console.log("mood-tracker serving "+root+" on :"+port));
'
