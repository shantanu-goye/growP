import { useState, useEffect } from 'react'
import { Home, Settings, User, BookOpen, Mail, Menu,Landmark, ChevronLeft,ArrowRightLeft} from 'lucide-react'
import UserDashboard from '../pages/Dashbaord'
import TransactionForms from '../pages/Transaction'
import TransactionPassbook from '../pages/Passbook'
import Setting from '../pages/Settings'
export default function ResponsiveLayout() {
  const [activeTab, setActiveTab] = useState('home')
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Check if screen is mobile width
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkIfMobile()
    window.addEventListener('resize', checkIfMobile)
    
    return () => {
      window.removeEventListener('resize', checkIfMobile)
    }
  }, [])
  
  // Navigation items with their icons and content
  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home size={24} />,
   content: <UserDashboard setActiveTab={setActiveTab} />

    },
    {
      id: 'transaction',
      label: 'Transaction',
      icon: <ArrowRightLeft  size={24} />,
      content:<TransactionForms/>
    },
    {
      id: 'passbook',
      label: 'Passbook',
      icon: <Landmark size={24} />,
      content: <TransactionPassbook/>
    },
  
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings size={24} />,
      content: (
        <Setting />
      )
    }
  ]
  
  // Find current nav item content
  const activeContent = navItems.find(item => item.id === activeTab)?.content
  
  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 shadow flex items-center">
        {!isMobile && (
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="mr-3 p-1 rounded-md hover:bg-blue-500"
          >
            {sidebarCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        )}  
        <h1 className="text-xl font-bold">GroWp</h1>
      </header>
      
      {/* Main content area with sidebar or bottom nav */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar for desktop */}
        {!isMobile && (
          <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} transition-all duration-300 bg-gray-100 border-r shadow-sm`}>
            <nav className="p-4">
              <ul className="space-y-2">
                {navItems.map(item => (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveTab(item.id)}
                      className={`flex items-center ${!sidebarCollapsed ? 'space-x-3' : 'justify-center'} w-full p-3 rounded-lg ${
                        activeTab === item.id ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'
                      }`}
                      title={sidebarCollapsed ? item.label : ''}
                    >
                      {item.icon}
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        )}
        
        {/* Main content */}
        <main className="flex-1 overflow-auto ">
          {activeContent}
        </main>
      </div>
      
      {/* Bottom navigation for mobile */}
      {isMobile && (
        <nav className="bg-white border-t shadow-lg">
          <ul className="flex justify-around">
            {navItems.map(item => (
              <li key={item.id} className="flex-1">
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center justify-center w-full py-2 ${
                    activeTab === item.id ? 'text-blue-600' : 'text-gray-600'
                  }`}
                >
                  {item.icon}
                  <span className="text-xs mt-1">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}