import { useCallback } from "react";

function TextUpdateNode(props) {
  const onChange = useCallback((evt) => {
    console.log("TextUpdateNode", evt.target.value);
  }, []);
 
  return (
    <div className="text-updater-node">
      <div>
        <label htmlFor="text">Text:</label>
        <input id="text" name="text" onChange={onChange} className="nodrag" />
      </div>
    </div>
  );
}

export default  TextUpdateNode

