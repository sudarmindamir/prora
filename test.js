const reMap={PHOTOGRAPHY_GENRE:'pfxGenre',CAMERA_FORMAT:'pfxCam',ART_DIRECTION:'pfxArt',BRAND_INDUSTRY:'brandIndustry',SUBJECT_TYPE:'subjectType',SUBJECT_AGE:'subjectAge',SUBJECT_BUILD:'subjectBuild',SUBJECT_HAIR:'subjectHair',FACIAL_EXPRESSION:'expression',MICRO_EXPRESSION:'microExpr',EYE_INTENSITY:'eyeIntensity',EMOTION_CORE:'emotionCore',POWER_LEVEL:'power',ARCHETYPE:'archetype',ENVIRONMENT:'environment',ATMOSPHERE:'atmosphere',FRAME_DENSITY:'frameDensity',WARDROBE:'wardrobe',WARDROBE_DETAIL:'wardrobeDetail',OUTERWEAR:'outerwear',ACCESSORIES:'accessories',ACTION_POSE:'action',HAND_POSITION:'hand',SUBJECT_FACING:'subjectFacing',GAZE:'subjectFacing',MAKEUP:'makeup',MOTION_BLUR:'motionBlur',FOREGROUND_DISTANCE:'fgDist',BACKGROUND_DISTANCE:'bgDist',FRAMING_CROP:'framing',PALETTE:'palette',LIGHTING:'lighting',SHADOW:'shadow',WHITE_BALANCE:'wb',LENS:'lens',APERTURE:'aperture',CAMERA_ANGLE:'camAngle',SHOT_SIZE:'shotSize',COMPOSITION:'composition',RETOUCH:'retouch',COLOR_GRADE:'grade',RESOLUTION:'resolution',ASPECT_RATIO:'aspectRatio',SUBJECT_ETHNICITY:'ethnicity'};
function parseRE(t){
  const r={};
  t.split('\n').forEach(l=>{
    const cl=l.replace(/^[-*•\s]+/, '').replace(/\*\*/g, '');
    const m=cl.match(/^([A-Z_]+)\s*:\s*(.+)$/i);
    if(m) r[m[1].trim().toUpperCase()] = m[2].trim().replace(/^\[|\]$/g,'').trim();
  });
  return r;
}
const txt = `
- PHOTOGRAPHY_GENRE: fashion editorial
- CAMERA_FORMAT: 35mm
- LIGHTING: soft editorial
- CUSTOM_VAR: something
`;
console.log(parseRE(txt));
