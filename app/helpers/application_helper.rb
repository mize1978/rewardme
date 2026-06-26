module ApplicationHelper
  EGG_COLOR_FILTERS = {
    "pink"   => "",
    "blue"   => "",
    "purple" => "",
    "yellow" => ""
  }.freeze

  def ribbon_color_style(user = current_user)
    filter = EGG_COLOR_FILTERS[user&.egg_color.to_s]
    filter.present? ? "filter: #{filter};" : ""
  end

  def egg_color_style(color)
    filter = EGG_COLOR_FILTERS[color.to_s]
    filter.present? ? "filter: #{filter};" : ""
  end

  def notification_tasks
    return [] unless current_user
    @notification_tasks ||= current_user.tasks
      .where(done: false)
      .where('date IS NOT NULL AND date <= ?', Date.current)
      .order(date: :asc)
      .limit(15)
  end

  def ribbon_color_class(user = current_user)
    "ribbon-color--#{user&.egg_color || 'pink'}"
  end
end
