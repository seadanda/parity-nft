export default function ImageGenPage() {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>NFT Image Generator</title>
        <style>{`
          body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: #0a0a0f;
          }
          #container {
            width: 100vw;
            height: 100vh;
          }
        `}</style>
        <script src="/three.min.js" />
        <script src="/OrbitControls.js" />
        <script src="/GLTFLoader.js" />
        <script src="/RGBELoader.js" />
        <script src="/Pass.js" />
        <script src="/ShaderPass.js" />
        <script src="/EffectComposer.js" />
        <script src="/RenderPass.js" />
        <script src="/UnrealBloomPass.js" />
        <script src="/LuminosityHighPassShader.js" />
        <script src="/CopyShader.js" />
        <script src="/inline_assets.js" />
      </head>
      <body>
        <div id="container" />
        <script src="/sketch-nobase64.js" />
      </body>
    </html>
  );
}
