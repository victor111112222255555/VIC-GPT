import React from 'react';
import { StoryIdea } from '../../types';
import { RefreshIcon } from '../icons/RefreshIcon';
import { LoadingSpinner } from '../icons/LoadingSpinner';

interface Props {
    ideas: StoryIdea[];
    onSelect: (idea: StoryIdea) => void;
    onBack: () => void;
    onRegenerate: () => void;
    isLoading: boolean;
}

const Step2_StoryIdeas: React.FC<Props> = ({ ideas, onSelect, onBack, onRegenerate, isLoading }) => {
    return (
        <div className="p-8">
            <button onClick={onBack} className="mb-8 text-text-secondary hover:text-white">&larr; Back to Context</button>
            <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-4">
                     <h2 className="text-3xl font-bold">Choose a Story Idea</h2>
                     <button
                        onClick={onRegenerate}
                        disabled={isLoading}
                        className="p-2 rounded-full bg-panel-bg text-text-secondary hover:bg-opacity-80 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Regenerate story ideas"
                     >
                        {isLoading ? <LoadingSpinner className="h-5 w-5" /> : <RefreshIcon className="h-5 w-5" />}
                     </button>
                </div>
                <p className="text-lg text-text-secondary mt-2">Here are 10 unique ideas based on your context. Click one to continue or regenerate for new ideas.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ideas.map((idea, index) => (
                    <div
                        key={index}
                        onClick={() => onSelect(idea)}
                        className="panel panel-hover p-6 cursor-pointer"
                    >
                        <h3 className="text-xl font-bold mb-2">{idea.title}</h3>
                        <p className="text-text-secondary">{idea.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Step2_StoryIdeas;
