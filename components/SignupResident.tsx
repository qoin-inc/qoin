import React from 'react';

/**
 * Placeholder SignupResident component used to satisfy import '@/components/SignupResident'.
 * Accepts optional props used in the real component.
 */
interface SignupResidentProps {
  sessionUser?: any;
  onComplete?: () => void;
  onCancel?: () => void;
}

const SignupResident: React.FC<SignupResidentProps> = ({ sessionUser, onComplete, onCancel }) => {
  // Placeholder UI; logs props for debugging.
  console.log('SignupResident placeholder props', { sessionUser, onComplete, onCancel });
  return (
    <div style={{ padding: '1rem', backgroundColor: '#f0f0f0' }}>
      <h2>SignupResident (Placeholder)</h2>
      <p>This is a placeholder component for resident sign‑up.</p>
    </div>
  );
};

export default SignupResident;
