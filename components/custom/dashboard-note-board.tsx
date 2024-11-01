import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import CustomButton from '@/components/custom/custom-button';

import AugmentedPopup from '@/components/augmented/components/augmented-popup';
import { ViewFrameDashboard } from '@/components/custom/view-frame';
import { useWidgetModal,WIDGET_SIZE, WIDGET_TYPES } from '@/components/utils/use-widget-modal';

import Note from './dashboard-note';
import DashboardWidgetTools from './dashboard-widget-tools';
import { User } from '@/db/schema';

interface DashboardNotesBoardProps {
  address?: string;
  user?: User;
};

const DashboardNotesBoard: React.FC<DashboardNotesBoardProps> = ({ address, user }) => {
  const { widgets, loadWidgets, removeWidget, updateWidget, setUserId, addWidget, isImageUploading,addImageWidget } = useWidgetModal();
  const [isShowDeletePopup, setIsShowDeletePopup] = useState(false);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  //const [updatedWidgets, setUpdatedWidgets] = useState<Widget[]>(widgets||[]);

  useEffect(() => {
    if (user) {
      setUserId(user.id as string);
      loadWidgets();
      //setUpdatedWidgets(widgets || []);
    }
  }, [user, setUserId, loadWidgets]);
  
  useEffect(() => {
    if (isImageUploading) {
      setUserId(user?.id as string);
      loadWidgets();
    }
  }, [isImageUploading, loadWidgets, user]);
  

  useEffect(() => {
    if (widgets.length == 0 && !localStorage.getItem('activeUser')) {
      setUserId(user?.id as string);
      addWidget({
        type: WIDGET_TYPES.TEXT,
        content: 'Welcome',
        size: WIDGET_SIZE.XS_SMALL,
        userId: user?.id as string,
        id: '1',
        index: '1'
      });
      addImageWidget('/assets/background-new.jpg');
      addWidget({
        type: WIDGET_TYPES.TEXT,
        content: 'To',
        size: WIDGET_SIZE.XS_SMALL,
        userId: user?.id as string,
        id: '2',
        index: '2'
      });
      
      localStorage.setItem('activeUser', 'true');
      loadWidgets();
    }
  }, [widgets]);

  //console.log('widgets', updatedWidgets);

  const moveNote = (fromIndex: number, toIndex: number) => {
    //moveWidget(fromIndex, toIndex);
    const updatedWidgets = [...widgets];

    console.log('🚀 ~ moveNote ~ widgets:', updatedWidgets);
    const [movedWidget] = updatedWidgets.splice(fromIndex, 1);

    console.log('🚀 ~ moveNote ~ movedWidget:', movedWidget);

    updatedWidgets.splice(toIndex, 0, movedWidget);
    console.log('updatedWidgets', updatedWidgets);
    //setUpdatedWidgets(updatedWidgets);
  };

  const handleWidgetClick = (widgetId: string) => {
    if (!address) {
      setSelectedWidgetId(widgetId);
      // setShowDeletePopup(true);
    }
  };

  const handleConfirmRemove = () => {
    if (selectedWidgetId) {
      removeWidget(selectedWidgetId);
    }
    setIsShowDeletePopup(false);
  };

  useEffect(() => {
    console.log("widgets",widgets)
    if (widgets.length === 0) {
      setWidgetsList(DUMMY_WIDGET_LIST);
    } else {
      setWidgetsList(widgets);
    }
  }, [widgets]);

  const handleClickDelete = () => {
    setIsShowDeletePopup(true);
  };

  const handleChangeSize = (size: WIDGET_SIZE) => {
    updateWidget(selectedWidgetId || '', { size });
  };

  const handleClickOutside = () => {
    setSelectedWidgetId(null);
  };

  console.log('widgets', widgets);

  return (
    <DndProvider backend={HTML5Backend}>
      <div key={widgets.length} className="flex min-h-[200px] flex-wrap px-6">
        {widgets.map((widget, index) => (
          <Note
            key={index}
            id={widget.id}
            index={index}
            moveNote={moveNote}
            size={widget.size as WIDGET_SIZE || WIDGET_SIZE.MEDIUM}
            isSelected={selectedWidgetId === widget.id}
            onClick={() => handleWidgetClick(widget.id)}
            onClickOutside={handleClickOutside}
            onDelete={handleClickDelete}
            onChangeSize={handleChangeSize}
          >
            {widget.type === 'image' ? (
              <img
                src={widget.code || ''}
                width={400}
                height={400}
                alt={widget.description || 'Widget Image'}
                className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 object-cover"
              />
            ) : widget.type === 'text' ? (
              <span>{widget.content}</span>
            ) : (
              <ViewFrameDashboard id={widget.id} code={widget.code || ''} />
            )}
          </Note>
        ))}
      </div>
      <AugmentedPopup
        visible={isShowDeletePopup}
        textHeading="Remove Widget"
        onClose={() => setIsShowDeletePopup(false)}
      >
        <div className="flex flex-col gap-5 p-8">
          <p>{`Are you sure you want to remove this widget?`}</p>
          <div className="mt-4 flex justify-end gap-2">
            <CustomButton
              className="text-sm font-semibold"
              onClick={() => setIsShowDeletePopup(false)}
            >{`Cancel`}</CustomButton>
            <CustomButton className="text-sm font-semibold" onClick={handleConfirmRemove}>{`Remove`}</CustomButton>
          </div>
        </div>
      </AugmentedPopup>
      <div className="px-8 py-6">
        <DashboardWidgetTools user={user as User}/>
      </div>
    </DndProvider>
  );
};

export default DashboardNotesBoard;
