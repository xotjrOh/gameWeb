export const playFanfare = () => {
  if (typeof window === 'undefined') {
    return;
  }
  const AudioContextCtor: typeof AudioContext | undefined =
    window.AudioContext ||
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
  if (!AudioContextCtor) {
    return;
  }

  const context = new AudioContextCtor();
  const now = context.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5];

  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startTime = now + index * 0.18;
    const endTime = startTime + 0.2;

    oscillator.type = 'triangle';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startTime);
    oscillator.stop(endTime);
  });

  setTimeout(() => {
    context.close();
  }, 1200);
};
