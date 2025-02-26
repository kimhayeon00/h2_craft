'use client';

export default function FeedbackButton() {
  const handleFeedback = () => {
    window.location.href = 'mailto:h2craft3000@gmail.com?subject=h2_craft 피드백';
  };

  return (
    <button 
      onClick={handleFeedback}
      className="feedbackButton"
    >
      피드백 💌
    </button>
  );
} 