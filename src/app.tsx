import { h } from 'preact'
import { useState, useEffect, useCallback, useRef } from 'preact/hooks'
import './app.css'
import { Rarity, getQRCodeRarity, useThrottle, hashQRCodeData, getColorFromHash, getNameFromHash, getRainbowColor } from './helpers'
import tinycolor from 'tinycolor2';
import classNames from 'classnames';

import jsQR from "jsqr";

interface Face {
  name: string;
  color: string;
  rarity: Rarity;
}

const createFace = (name: string, color: string, rarity: Rarity = 1): Face => {
  return { name, color, rarity };
};

const isRare = (rarity: Rarity): boolean => rarity >= 8;

export function App() {
  const [collection, setCollection] = useState<Face[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [cameraOn, setCameraOn] = useState<boolean>(false);
  const [foundFace, setFoundFace] = useState<Face | null>(null);

  const video = useRef<HTMLVideoElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);

  const throttledFoundFace = useThrottle(foundFace, 5000);

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
    if (c.isLight()) c = c.desaturate(10).darken(65);
    else c = c.desaturate(10).lighten(55);
    const contrastColor = c.toHexString();
    const isReallyDark = tinycolor(face.color).getLuminance() < 0.005;

    const borderColor = isReallyDark ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)";

    const className = classNames("collected-face border-2", {
      "animate-rainbow": isRare(face.rarity),
      "transition-transform": true,
      "hover:scale-110": true,
      "hover:rotate-6": true
    });

    const style = {
      "background-color": isRare(face.rarity) ? 'animate-rainbow' : face.color,
      "border-color": borderColor
    };

    return (
      <div className="flex flex-col">
        <div className={className} style={style}>
          <div class="eye left" style={{ "background-color": contrastColor }}></div>
          <div class="eye right" style={{ "background-color": contrastColor }}></div>
        </div >

        <div class="mt-4 flex justify-center align-middle gap-1">
          <button class="w-6 h-6" onClick={() => {
            const msg = `Are you sure you want to remove "${face.name}" from your collection?`;

            confirm(msg) &&
              setCollection(collection.filter(f => f !== face));
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="#a0a0a0" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" aria-hidden="true" data-slot="icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>

          <div class="inline-block relative border-2 font-bold bg-teal-300 rounded-md px-2" style={{
            "border-color": borderColor
          }}>
            <div>{face.name}</div>
            <div class="size-6 rounded-full bg-red-600 text-white font-normal absolute -top-3 -right-3">
              {face.rarity}
            </div>
          </div>
        </div>
      </div>
    )
  };

  return (
    <div className="max-w-screen-md mx-auto">
      <h1 className="my-6 text-7xl text-teal-300 font-black">
        QR Code game
      </h1>
      <div>
        <video ref={video} autoplay></video>

        <canvas ref={canvas} width="640" height="480" style="display: none;"></canvas>

        <div id="output">
          {cameraOn && <p className="text-red-400">Scanning...</p>}

          {throttledFoundFace && (foundFaceUI(throttledFoundFace))}

        </div>
      </div>

      <div id="collection" className="gap-6">
        {collection.map(faceUI)}
      </div>

      <div className="flex gap-4 mx-auto mt-36 justify-center">
        {collection.length > 0 && (<button className="font-semibold text-white rounded bg-orange-500 py-2 px-3" onClick={
          () => {
            const confirmed = confirm("Are you sure you want to reset your collection?");
            if (!confirmed) return;
            setCollection([]);
          }
        }>Reset Collection</button>)}

        <button
          className="text-white font-semibold rounded bg-orange-500 py-2 px-3" onClick={() => setCameraOn(c => !c)}>{cameraOn ? "Stop Camera" : "Start Camera"}</button>

      </div>
    </div>
  )
}
