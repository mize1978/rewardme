Rails.application.routes.draw do
  root  'pages#lp'
  get 'dashboard', to: 'tasks#index', as: :dashboard

  get 'signup', to: 'users#new'
  post 'signup', to: 'users#create'

  get 'login', to: 'sessions#new'
  post 'login', to: 'sessions#create'
  delete 'logout', to: 'sessions#destroy'

  resources :tasks

  get  'shop',                  to: 'furnitures#shop',   as: :shop
  post 'furniture/:id/toggle', to: 'furnitures#toggle', as: :toggle_furniture

  get  'choose_egg',  to: 'egg_colors#show',          as: :choose_egg
  post 'choose_egg',  to: 'egg_colors#update'
  post 'daily_box',   to: 'boxes#open',              as: :daily_box
  post 'room_bg/:id/set', to: 'room_backgrounds#set', as: :set_room_bg
  get 'mytasks',      to: 'tasks#list',              as: :my_tasks
  get 'habits',       to: 'pages#habits',            as: :habits
  get 'achievements', to: 'pages#achievements',      as: :achievements
  get   'settings',   to: 'pages#settings',          as: :settings
  patch 'settings',   to: 'pages#update_settings'

  get 'letters',     to: 'letters#index', as: :letters
  get 'letters/:id', to: 'letters#show',  as: :letter

  get  'games/tap',        to: 'games#tap_game',        as: :tap_game
  post 'games/tap/result', to: 'games#tap_game_result', as: :tap_game_result

  get  'games/gacha',      to: 'games#gacha',           as: :gacha
  post 'games/gacha/pull', to: 'games#gacha_pull',      as: :gacha_pull

  get 'l', to: redirect('/')
end