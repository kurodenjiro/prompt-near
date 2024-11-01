'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import classNames from 'classnames';
import BoderImage from '@/components/common/border-image';

import line from '@/public/assets/svgs/line.svg';
import ProfileBottomFrameBorder from '@/public/assets/svgs/profile-bottom-frame-border.png';

import DashboardAgentList from '@/components/custom/dashboard-agent-list';
import DashboardBottomProfileDecor from '@/components/custom/dashboard-bottom-profile-decor';
import DashboardNotesBoard from '@/components/custom/dashboard-note-board';
import { toast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { User } from '@/db/schema';
import ChatPopup from '@/components/custom/chat-popup';
import axios from 'axios';

type ProfileWidgetProps = {
  user: User;
  className?: string
};

const ProfileWidget: FC<ProfileWidgetProps> = ({ className, user }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [isOpenModal, setIsOpenModal] = useState<boolean>(false);

  const fetchAgentByUsername = useCallback(async () => {
    setIsLoading(true);
    try {
      if (user) {
        const response = await fetch(`/api/agents?userId=${user.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch agent');
        }
        const agents = await response.json();

        setAgents(agents);
      }
    } catch (error) {
      console.error('Error fetching agent:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAgentByUsername();
  }, [fetchAgentByUsername]);

  const handleAgentClick = (agent: any) => {
    console.log(agent);
    setSelectedAgent(agent);
    setIsOpenModal(true);
  };

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);

    try {
      if (user?.id) {
        const response = await axios.get(`/api/agents?userId=${user?.id}`);
        const fetchedAgents = response.data;
        console.log('fetchedAgents', fetchedAgents);
        setAgents(fetchedAgents);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <BoderImage
      imageBoder={ProfileBottomFrameBorder.src}
      className={classNames('relative flex w-full max-w-[483px] justify-center p-0', className)}
    >
      <DashboardBottomProfileDecor />
      <div className="w-full">
        <p className="px-8 py-4">Agent Creator ({agents.length})</p>
        <div className="flex flex-col gap-6 px-8 py-6">
          <DashboardAgentList items={agents} onClick={handleAgentClick} />
        </div>
        <Image src={line.src} alt="line" className="w-full" width={line.width} height={line.height} />
        <DashboardNotesBoard address={user.username} />
      </div>
      {selectedAgent && (
        <ChatPopup
          visible={isOpenModal}
          refetch={fetchAgents}
          inforAgent={selectedAgent}
          onClose={() => setIsOpenModal(false)}
        />
      )}
    </BoderImage>
  );
};

export default ProfileWidget;
