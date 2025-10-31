import React from 'react';
import { GoogleOAuthProvider, GoogleLogin, CredentialResponse } from '@react-oauth/google';

interface Props {
    onSuccess: (credentialResponse: CredentialResponse) => void;
}

const GoogleLoginScreen: React.FC<Props> = ({ onSuccess }) => {
    const handleLoginError = () => {
        console.error('Login Failed');
        // TODO: Could show an error message to the user
    };

    return (
        <GoogleOAuthProvider clientId={process.env.GOOGLE_CLIENT_ID!}>
            <div className="fixed inset-0 bg-bg-color/60 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="panel-glass p-8 shadow-2xl w-full max-w-sm text-center transform transition-all"
                     style={{ animation: 'fadeInUp 0.5s ease-out forwards' }}
                >
                    <h2 className="text-2xl font-bold text-white mb-4">VIC-GPT Access</h2>
                    <p className="text-text-secondary mb-8">Please sign in with your Google account to continue.</p>
                    <div className="flex justify-center">
                        <GoogleLogin
                            onSuccess={onSuccess}
                            onError={handleLoginError}
                            theme="filled_black"
                            shape="pill"
                            width="300px"
                        />
                    </div>
                </div>
                 <style>{`
                    @keyframes fadeInUp {
                        from { opacity: 0; transform: scale(0.95) translateY(10px); }
                        to { opacity: 1; transform: scale(1) translateY(0); }
                    }
                `}</style>
            </div>
        </GoogleOAuthProvider>
    );
};

export default GoogleLoginScreen;
