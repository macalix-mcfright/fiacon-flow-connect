// This service encapsulates the WebRTC logic
let peerConnection: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;

// Using public STUN servers. For enterprise production, a dedicated TURN server (e.g., via Twilio or a self-hosted Coturn) is recommended.
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const webRTCService = {
  onRemoteStream: (stream: MediaStream) => {},
  onICECandidate: (candidate: RTCIceCandidate) => {},

  async startLocalStream(): Promise<MediaStream> {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    return localStream;
  },

  createPeerConnection() {
    if (peerConnection) {
      this.close();
    }
    peerConnection = new RTCPeerConnection(configuration);

    // Add local stream tracks to the connection
    localStream?.getTracks().forEach(track => {
      peerConnection?.addTrack(track, localStream!);
    });

    // Handle incoming remote stream
    peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.onRemoteStream(event.streams[0]);
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.onICECandidate(event.candidate);
      }
    };
  },

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    this.createPeerConnection();
    if (!peerConnection) throw new Error("Peer connection not established");
    
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    return offer;
  },

  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    this.createPeerConnection();
    if (!peerConnection) throw new Error("Peer connection not established");

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    return answer;
  },

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!peerConnection) return;
    const remoteDesc = new RTCSessionDescription(answer);
    await peerConnection.setRemoteDescription(remoteDesc);
  },

  async handleNewICECandidate(candidate: RTCIceCandidateInit) {
    if (!peerConnection) return;
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error('Error adding received ice candidate', e);
    }
  },
  
  toggleMute(isMuted: boolean) {
    localStream?.getAudioTracks().forEach(track => {
      track.enabled = !isMuted;
    });
  },

  close() {
    peerConnection?.close();
    peerConnection = null;
    localStream?.getTracks().forEach(track => track.stop());
    localStream = null;
  }
};
