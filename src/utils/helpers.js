
// Format form data for display
  export const formatFormDataForDisplay = (formData) => {
    if (!formData || Object.keys(formData).length === 0) {
      return "No form data";
    }
    
    return Object.entries(formData)
      .map(([key, value]) => ` ${key}: ${value}`)
      .join('\n');
  };


  // for displaying array of formData
  export const formatArrayOfObjects = (formDataArray) =>{
    const allTextArray = formDataArray.map((d,i)=> {
        const nodeVal = Object.values(formDataArray[i])[0];
        const nodeKey = Object.keys(formDataArray[i])[0]
        return `${nodeKey} : \n${formatFormDataForDisplay(nodeVal)}`
    })
    return allTextArray.join('\n\n');
  }

  // Combine all formData to one object
export const combineObjectValues = (array) => {
    console.log('combineArrayObjects ',array)
  return array.reduce((acc, curr) => ({ ...acc, ...Object.values(curr)[0] }), {});
}
