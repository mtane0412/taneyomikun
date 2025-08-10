/**
 * プロフィールアイコンのサークル表示コンポーネント
 */
import React from 'react'
import profileIcon from '../assets/images/profile_garlic.png'

interface ProfileIconProps {
  size?: number
  className?: string
}

export const ProfileIcon: React.FC<ProfileIconProps> = ({
  size = 48,
  className = '',
}) => {
  return (
    <div
      className={`profile-icon-container ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
      }}
    >
      <img
        src={profileIcon}
        alt="プロフィールアイコン"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </div>
  )
}
