# Ikanin.co - Static Site

Static HTML (tanpa build step). `index.html` ada di root, aset di `assets/`.

## Deploy ke Vercel
**Via dashboard:** push folder ini ke GitHub -> vercel.com/new -> Import -> Framework Preset: **Other** -> Deploy
(Build Command & Output Directory dikosongkan.)

**Via CLI:**
    npm i -g vercel
    vercel --prod
