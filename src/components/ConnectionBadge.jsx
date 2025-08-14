import {  useNodeConnections} from '@xyflow/react';

// Component to show connection count as a badge
function ConnectionBadge() {
  const connections = useNodeConnections({
    handleType: 'target',
  });
 
  if (!connections.length) return null;

  return (
    <div className='absolute -top-2 -left-2 bg-blue-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md z-10'>
      {connections.length}
    </div>
  );
}

export default ConnectionBadge;
