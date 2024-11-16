import { useState, useEffect, useCallback, useRef } from 'preact/hooks'
import './app.css'
import { hashQRCodeData, getColorFromHash, getNameFromHash, isRareQRCode, getRainbowColor } from './helpers'


// // Display face with name and color
// function showFaceWithName(data) {
// }




const createFace = (name, color, hat) => {
  return { name, color, hat };
};

export function App() {
  const [collection, setCollection] = useState([]);
  const [errors, setErrors] = useState([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [foundFace, setFoundFace] = useState(null);

  const video = useRef(null);
  const canvas = useRef(null);

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
          video.current.srcObject = stream;
          video.current.setAttribute("playsinline", true);
          requestAnimationFrame(scanQRCode);
        })
        .catch(() => {
          setErrors(["Error accessing the camera. Please ensure that your browser has camera access permissions."]);
        });
    } else {
      if (video.current.srcObject === null) return;
      video.current.srcObject.getTracks().forEach(track => {
        track.stop();
      })

      video.current.srcObject = null;
    }
  }, [cameraOn, video])


  // Function to scan QR code from video
  const scanQRCode = useCallback(() => {
    if (video.current === null || canvas.current === null) return;

    const ctx = canvas.current.getContext('2d');

    if (video.current.readyState === video.current.HAVE_ENOUGH_DATA) {
      ctx.drawImage(video.current, 0, 0, canvas.current.width, canvas.current.height);
      const imageData = ctx.getImageData(0, 0, canvas.current.width, canvas.current.height);
      const qrCode = jsQR(imageData.data, canvas.current.width, canvas.current.height);

      if (qrCode) {
        const hash = hashQRCodeData(qrCode.data);
        hash.then(hashBuffer => {
          // const isRare = isRareQRCode(hashBuffer);
          const isRare = false
          const color = isRare ? getRainbowColor() : getColorFromHash(hashBuffer);
          const name = getNameFromHash(hashBuffer);
          setFoundFace({ name, color });
        });
      } else {
        setFoundFace(null);
      }
    }
    requestAnimationFrame(scanQRCode);
  }, [video, canvas])


  const faceUI = (face, showButton = false) => {
    return (
      <>
        <div className="collected-face" style={{
          "background-color": face.color
        }}>
          <div class="eye left" ></div>
          <div class="eye right"></div>
          <p>{face.name}</p>
        </div >

        {showButton && (<button onClick={() => {
          setCollection([...collection, createFace(face.name, face.color)]);
        }}>Add!</button>)}
      </>
    )
  };

  return (
    <>
      <h1>QR Code game</h1>
      <div>
        <video ref={video} autoplay></video>
        <canvas ref={canvas} width="640" height="480" style="display: none;"></canvas>
        <div id="output">
          <p id="qr-result">QR Code: <span id="result"></span></p>

          {cameraOn && <p id="scan-status">Scanning...</p>}

          {foundFace && (faceUI(foundFace, true))}

        </div>
      </div>

      <div id="collection">{collection.map(face => faceUI(face, false))}</div>

      <button id="reset-btn" onClick={
        () => {
          const confirmed = confirm("Are you sure you want to reset your collection?");
          if (!confirmed) return;
          setCollection([]);
        }
      }>Reset Collection</button>

      <button onClick={() => setCameraOn(!cameraOn)}>{cameraOn ? "Stop Camera" : "Start Camera"}</button>
    </>
  )
}
