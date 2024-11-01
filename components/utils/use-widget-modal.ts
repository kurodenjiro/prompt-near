import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Widget = {
    id: string;
    name?: string | null;
    createdAt?: Date;
    type: string;
    icon?: string | null;
    content?: string | null;
    size?: string | null;
    code?: string | null;
    description?: string | null;
    index?: string | null;
    userId: string;
};

export enum WIDGET_TYPES {
    TEXT = 'text',
    IMAGE = 'image',
    INPUT = 'input',
    CONTACT_TOOL = 'contactTool'
  }
  
  export enum WIDGET_SIZE {
    XS_SMALL = 'xs-small',
    SMALL = 'small',
    MEDIUM = 'medium',
    LARGE = 'large'
  }
  
export const DUMMY_WIDGET_LIST: Widget[] = [
    {
      id: '1',
      index: '1',
      type: WIDGET_TYPES.TEXT,
      content: 'Welcome',
      size: WIDGET_SIZE.XS_SMALL,
      userId: ''
    },
    {
      id: '2',
      index: '2',
      type: WIDGET_TYPES.TEXT,
      content: 'To',
      size: WIDGET_SIZE.XS_SMALL,
      userId: ''
    },
    {
      id: '3',
      index: '3',
      type: WIDGET_TYPES.IMAGE,
      code: '/assets/background-new.jpg', 
      description: 'Onchain Agent',
      size: WIDGET_SIZE.LARGE,
      userId: ''
    }
];

interface IWidgetModalStore {
  isOpen: boolean;
  widgets: Widget[];
  userId: string | null;
  setUserId: (userId: string) => void;
  loadWidgets: () => Promise<void>;
  openWidgetModal: () => void;
  closeWidgetModal: () => void;
  addWidget: (widget: Widget) => Promise<void>;
  removeWidget: (widgetId: string) => Promise<void>;
  updateWidget: (widgetId: string, widget: Partial<Widget>) => Promise<void>;
  moveWidget: (widgetId: number, newIndex: number) => Promise<void>;
  isImageUploading: boolean;
  addImageWidget: (imageData: string) => Promise<void>;
}

export const useWidgetModal = create(
  persist<IWidgetModalStore>(
    (set, get) => ({
      isOpen: false,
      widgets: [],
      userId: null,
      setUserId: (userId: string) => set({ userId }),
      loadWidgets: async () => {
        const state = get();
        if (!state.userId) return;
        
        const response = await fetch(`/api/widgets?userId=${state.userId}`);
        const widgets = await response.json();
        set({ widgets: widgets.map((w: Widget) => ({
          ...w,
          index: w.index || undefined
        })) });
      },
      openWidgetModal: () => set({ isOpen: true }),
      closeWidgetModal: () => set({ isOpen: false }),
      updateWidget: async (widgetId, updates) => {
        const response = await fetch(`/api/widgets?widgetId=${widgetId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        
        if (response.ok) {
          set(state => ({
            widgets: state.widgets.map(w => 
              w.id === widgetId ? { ...w, ...updates } : w
            )
          }));
        }
      },
      addWidget: async (widget: Widget) => {
        const state = get();
        console.log('state', state);
        if (!state.userId) return;
        console.log('widget', widget);
        const newWidget = {
          ...widget,
          userId: state.userId,
          createdAt: new Date(),
          name: widget.name || null,
          icon: widget.icon || null,
          content: widget.content || null,
          size: widget.size || null,
          code: widget.code || null,
          description: widget.description || null,
          index: widget.index || null
        };

        const response = await fetch('/api/widgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newWidget)
        });

        if (response.ok) {
          const createdWidget = await response.json();
          set(state => ({
            widgets: [...state.widgets, createdWidget]
          }));
        }
      },
      removeWidget: async (widgetId: string) => {
        const response = await fetch(`/api/widgets?widgetId=${widgetId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          set(state => ({
            widgets: state.widgets.filter(widget => widget.id !== widgetId)
          }));
        }
      },
      moveWidget: async (widgetId: number, newIndex: number) => {
        const state = get();
        if (!state.widgets) return;

        const widgets = [...state.widgets];
        const currentIndex = widgets.findIndex(widget => Number(widget.index) === Number(widgetId));

        if (currentIndex !== -1) {
          const [movedWidget] = widgets.splice(currentIndex, 1);

          widgets.splice(newIndex, 0, movedWidget);
        }

        set(state => ({
          widgets
        }));
      },
      isImageUploading: false,
      addImageWidget: async (imageData: string) => {
        const state = get();
        if (!state.userId) return;

        set({ isImageUploading: true });

        try {
          const newWidget = {
            type: WIDGET_TYPES.IMAGE,
            name: 'Image Widget',
            icon: 'ico-image',
            code: imageData,
            size: WIDGET_SIZE.LARGE,
            userId: state.userId,
            createdAt: new Date(),
            content: null,
            description: null,
            index: `${state.widgets.length + 1}`,
          };

          const response = await fetch('/api/widgets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newWidget)
          });

          if (response.ok) {
            const createdWidget = await response.json();
            set(state => ({
              widgets: [...state.widgets, createdWidget]
            }));
          }
        } catch (error) {
          console.error('Error uploading image widget:', error);
        } finally {
          set({ isImageUploading: false });
        }
      }
    }),
    {
      name: 'widget-storage',
      storage: createJSONStorage(() => localStorage)
    }
  )
);
