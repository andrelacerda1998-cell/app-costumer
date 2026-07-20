import React from 'react';
import Svg, { G, Path, Defs, ClipPath, Rect } from 'react-native-svg';
import { Colors } from 'react-native/Libraries/NewAppScreen';

interface EmailIconProps {
  color: string;
}

const EmailIcon: React.FC<EmailIconProps> = ({ color }) => (
  <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
    <G clipPath="url(#clip0_64_927)">
      <Path
        d="M20.4224 4H3.57812C2.15712 4 1 5.14498 1 6.55298V17.447C1 18.855 2.15712 20 3.57812 20H20.4224C21.8444 20 23 18.855 23 17.447V6.55298C23 5.14498 21.8444 4 20.4224 4ZM21.2812 7.07495V17.447C21.2812 17.916 20.8964 18.2981 20.4224 18.2981H3.57812C3.10413 18.2981 2.71924 17.916 2.71924 17.447V7.07495L12 13.9121L21.2812 7.07495ZM3.73535 5.7019H20.2651L12 11.79L3.73535 5.7019Z"
        fill={color}
      />
    </G>
    <Defs>
      <ClipPath id="clip0_64_927">
        <Rect width="24" height="24" fill="white" />
      </ClipPath>
    </Defs>
  </Svg>
);

export default EmailIcon;
