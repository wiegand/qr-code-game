import { h } from 'preact'
import { useState, useEffect, useCallback, useRef } from 'preact/hooks'
import './app.css'
import { Rarity, getQRCodeRarity, useThrottle, hashQRCodeData, getColorFromHash, getNameFromHash, getRainbowColor } from './helpers'
import tinycolor from 'tinycolor2';

import jsQR from "jsqr";

interface Face {
  name: string;
  color: string;
  rarity: Rarity;
}

const createFace = (name: string, color: string, rarity: Rarity = 1): Face => {
  return { name, color, rarity };
};

const isRare = (rarity: Rarity): boolean => rarity > 5;

export function App() {
  const [collection, setCollection] = useState<Face[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [cameraOn, setCameraOn] = useState<boolean>(false);
  const [foundFace, setFoundFace] = useState<Face | null>(null);

  const video = useRef<HTMLVideoElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);

  const throttledFoundFace = useThrottle(foundFace, 500);

  console.log("Rendered");

  useEffect(() => {
    const data = localStorage.getItem('collection');
    if (data) setCollection(JSON.parse(data));
  }, [])

  useEffect(() => {
    localStorage.setItem('collection', JSON.stringify(collection));
  }, [collection])

  useEffect(() => {
    if (video.current === null) return;

    if (cameraOn) {
      // Get video stream from the camera
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(stream => {
          if (!video.current) return;
          video.current.srcObject = stream;
          video.current.setAttribute("playsinline", "true");
          requestAnimationFrame(scanQRCode);
        })
        .catch(() => {
          setErrors(["Error accessing the camera. Please ensure that your browser has camera access permissions."]);
        });
    } else {
      if (video.current.srcObject === null) return;
      const stream = video.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop())
      video.current.srcObject = null;
    }
  }, [cameraOn, video])


  // Function to scan QR code from video
  const scanQRCode = useCallback(() => {
    if (video.current === null || canvas.current === null) return;

    const ctx = canvas.current.getContext('2d');
    if (!ctx) return

    if (video.current.readyState === video.current.HAVE_ENOUGH_DATA) {
      ctx.drawImage(video.current, 0, 0, canvas.current.width, canvas.current.height);
      const imageData = ctx.getImageData(0, 0, canvas.current.width, canvas.current.height);
      const qrCode = jsQR(imageData.data, canvas.current.width, canvas.current.height);

      if (qrCode) {
        const hash = hashQRCodeData(qrCode.data);
        hash.then((hashBuffer: ArrayBuffer) => {
          const rarity = getQRCodeRarity(hashBuffer);
          const color = isRare(rarity) ? getRainbowColor() : getColorFromHash(hashBuffer);
          const name = getNameFromHash(hashBuffer);
          setFoundFace({ name, color, rarity });
        });
      } else {
        setFoundFace(null);
      }
    }
    requestAnimationFrame(scanQRCode);
  }, [video, canvas])


  const foundFaceUI = (face: Face) => {
    return (
      <div className="flex flex-col">
        <div className="collected-face" style={{
          "background-color": face.color
        }}>
          <div class="eye left" ></div>
          <div class="eye right"></div>
        </div >

        <p class="font-bold">{face.name}: {face.rarity}</p>

        <button onClick={() => {
          setCollection([...collection, createFace(face.name, face.color, face.rarity)]);
        }}>Add!</button>
      </div>
    )
  }

  const faceUI = (face: Face) => {
    let c = tinycolor(face.color);
    if (c.isLight()) c = c.darken(55);
    else c = c.lighten(55);
    const contrastColor = c.toHexString();
    const isReallyDark = tinycolor(face.color).getLuminance() < 0.05;

    const borderColor = isReallyDark ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)";

    return (
      <div className="flex flex-col transition-transform transform hover:scale-110 hover:rotate-6">
        <div className="collected-face border-2" style={{
          "background-color": face.color,
          "border-color": borderColor
        }}>
          <div class="eye left" style={{ "background-color": contrastColor }}></div>
          <div class="eye right" style={{ "background-color": contrastColor }}></div>
        </div >

        <p class="font-bold">{face.name}: {face.rarity}</p>
      </div>
    )
  };

  return (
    <div className="max-w-screen-md mx-auto">
      <h1 className="my-6 text-2xl font-bold text-teal-300">
        QR Code game
      </h1>
      <div>
        <video ref={video} autoplay></video>
        <canvas ref={canvas} width="640" height="480" style="display: none;"></canvas>
        <div id="output">
          {cameraOn && <p id="scan-status">Scanning...</p>}

          {throttledFoundFace && (foundFaceUI(throttledFoundFace))}

        </div>
      </div>

      <div id="collection">
        {collection.map(faceUI)}
      </div>

      <div className="flex gap-2 mx-auto mt-36 justify-center">
        {collection.length > 0 && (<button className="text-white rounded bg-orange-500 py-2 px-3" onClick={
          () => {
            const confirmed = confirm("Are you sure you want to reset your collection?");
            if (!confirmed) return;
            setCollection([]);
          }
        }>Reset Collection</button>)}

        <button className="text-white rounded bg-orange-500 py-2 px-3" onClick={() => setCameraOn(c => !c)}>{cameraOn ? "Stop Camera" : "Start Camera"}</button>
      </div>
    </div>
  )
}
