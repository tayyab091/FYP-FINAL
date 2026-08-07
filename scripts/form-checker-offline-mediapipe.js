/* Browser-side MediaPipe helper for offline form-checker tests. */
;(function () {
  let pendingResolve = null

  async function waitForPose() {
    const start = Date.now()
    while (!window.Pose) {
      if (Date.now() - start > 20000) throw new Error('MediaPipe Pose timeout')
      await new Promise((r) => setTimeout(r, 50))
    }
  }

  window.__initOfflinePoseOnPage = async function () {
    await waitForPose()
    const video = document.getElementById('v')
    if (!video) throw new Error('video element #v not found — load player.html first')

    const pose = new window.Pose({
      locateFile: (file) => 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/' + file,
    })
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })
    await pose.initialize()

    pose.onResults((r) => {
      if (pendingResolve) {
        const resolve = pendingResolve
        pendingResolve = null
        resolve(r)
      }
    })

    window.__offlinePose = pose
    window.__offlineVideo = video
    return { duration: video.duration, width: video.videoWidth, height: video.videoHeight }
  }

  window.__detectPoseAt = async function (sec) {
    const pose = window.__offlinePose
    const video = window.__offlineVideo
    if (!pose || !video) return null
    video.currentTime = sec
    await new Promise((r) => video.addEventListener('seeked', r, { once: true }))
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

    const result = await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        pendingResolve = null
        resolve(null)
      }, 8000)
      pendingResolve = (r) => {
        clearTimeout(timeout)
        resolve(r)
      }
      pose.send({ image: video }).catch(() => {
        clearTimeout(timeout)
        pendingResolve = null
        resolve(null)
      })
    })
    return result && result.poseLandmarks ? result.poseLandmarks : null
  }
})()
