interface LoadingStateProps {
  message: string;
  subMessage?: string;
}

const LoadingState = ({ message, subMessage }: LoadingStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mb-4"></div>
      <p className="text-lg text-gray-700 font-medium">{message}</p>
      {subMessage && <p className="text-gray-500 mt-2">{subMessage}</p>}
    </div>
  );
};

export default LoadingState; 