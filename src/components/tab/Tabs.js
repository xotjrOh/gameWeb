'use client'

import React from 'react';
import Tab from "./Tab";
import TabPanel from "./TabPanel";

export default function Tabs({ activeTab, onChange, children }) {
    return (
      <div>
        <div className="flex border-b border-gray-300">
          {React.Children.map(children, (child) => {
            // 자식이 Tab 컴포넌트인지 확인
            if (child.type === Tab) {
              return React.cloneElement(child, {
                isActive: activeTab === child.props.value,
                onClick: () => onChange(child.props.value),
              });
            }
            return null;
          })}
        </div>
        <div className="p-4">
          {React.Children.map(children, (child) => {
            // 자식이 TabPanel 컴포넌트인지 확인
            if (child.type === TabPanel && activeTab === child.props.value) {
              return child;
            }
            return null;
          })}
        </div>
      </div>
    );
}