require "rails_helper"

RSpec.describe ApplicationHelper, type: :helper do
  describe "#ribbon_box_image" do
    {
      "pink" => "ribbon_box_pink_v4.png",
      "purple" => "ribbon_box_purple_v3.png",
      "blue" => "ribbon_box_blue_v4.png",
      "yellow" => "ribbon_box_purple_v3.png"
    }.each do |color, image|
      it "#{color} に対応する箱を返す" do
        expect(helper.ribbon_box_image(User.new(egg_color: color))).to eq(image)
      end
    end
  end
end
